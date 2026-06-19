import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Tabs,
  Modal,
  Form,
  Input,
  message
} from 'antd';
import {
  EyeOutlined,
  WarningOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  FormOutlined,
  AuditOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Workbench = () => {
  const [summary, setSummary] = useState({
    total: 0,
    rectifying: 0,
    pending_review: 0,
    overdue: 0,
    reminded: 0,
    unresponded_reminder: 0,
    my_pending_rectification: 0,
    my_pending_review: 0,
    my_reminded: 0,
    store_stats: [],
  });
  const [tasks, setTasks] = useState([]);
  const [stores, setStores] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    store_id: undefined,
    executor_id: undefined,
    rectification_status: undefined,
    is_overdue: undefined,
    has_reminder: undefined,
    has_unresponded_reminder: undefined,
  });
  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [remindForm] = Form.useForm();
  const navigate = useNavigate();
  const { user, isManager, isReviewer, isExecutor } = useAuth();

  const statusMap = {
    pending: { color: 'default', text: '待执行' },
    executing: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const rectificationStatusMap = {
    rectifying: { color: 'processing', text: '整改中' },
    pending_review: { color: 'warning', text: '待复核' },
    overdue: { color: 'error', text: '已超期' },
  };

  const reminderStatusMap = {
    no_reminder: { color: 'default', text: '未催办' },
    unresponded: { color: 'warning', text: '已催办未响应' },
    responded: { color: 'success', text: '已响应' },
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const params = buildQueryParams();
      const response = await api.get('/tasks/workbench_summary/', { params });
      setSummary(response.data);
    } catch (error) {
      console.error('获取工作台汇总数据失败', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = buildQueryParams();
      const response = await api.get('/tasks/workbench_list/', { params });
      setTasks(response.data);
    } catch (error) {
      console.error('获取工作台任务列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const buildQueryParams = () => {
    const params = {};
    if (activeTab === 'my_pending_rectification') {
      params.view = 'my_pending_rectification';
    } else if (activeTab === 'my_pending_review') {
      params.view = 'my_pending_review';
    } else if (activeTab === 'my_reminded') {
      params.view = 'my_reminded';
    }
    if (filters.store_id) params.store_id = filters.store_id;
    if (filters.executor_id) params.executor_id = filters.executor_id;
    if (filters.rectification_status) params.rectification_status = filters.rectification_status;
    if (filters.is_overdue !== undefined) params.is_overdue = filters.is_overdue;
    if (filters.has_reminder !== undefined) params.has_reminder = filters.has_reminder;
    if (filters.has_unresponded_reminder !== undefined) params.has_unresponded_reminder = filters.has_unresponded_reminder;
    return params;
  };

  const fetchBaseData = async () => {
    try {
      const [storesRes, executorsRes] = await Promise.all([
        api.get('/stores/'),
        api.get('/users/executors/'),
      ]);
      setStores(storesRes.data);
      setExecutors(executorsRes.data);
    } catch (error) {
      console.error('获取基础数据失败', error);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchTasks();
  }, [activeTab, filters]);

  const handleRemind = async (values) => {
    try {
      await api.post(`/tasks/${selectedTask.id}/remind/`, values);
      message.success('催办发送成功');
      setRemindModalVisible(false);
      remindForm.resetFields();
      setSelectedTask(null);
      fetchSummary();
      fetchTasks();
    } catch (error) {
      message.error('催办发送失败');
    }
  };

  const handleQuickFilter = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey] === value ? undefined : value,
    }));
  };

  const getTabItems = () => {
    const items = [
      {
        key: 'all',
        label: (
          <span>
            全部任务
            {summary.total > 0 && <Tag style={{ marginLeft: 4 }}>{summary.total}</Tag>}
          </span>
        ),
      },
    ];

    if (isExecutor()) {
      items.push({
        key: 'my_pending_rectification',
        label: (
          <span>
            <FormOutlined /> 我的待整改
            {summary.my_pending_rectification > 0 && (
              <Tag color="error" style={{ marginLeft: 4 }}>{summary.my_pending_rectification}</Tag>
            )}
          </span>
        ),
      });
      items.push({
        key: 'my_reminded',
        label: (
          <span>
            <BellOutlined /> 已被催办
            {summary.my_reminded > 0 && (
              <Tag color="#eb2f96" style={{ marginLeft: 4 }}>{summary.my_reminded}</Tag>
            )}
          </span>
        ),
      });
    }

    if (isReviewer() || isManager()) {
      items.push({
        key: 'my_pending_review',
        label: (
          <span>
            <AuditOutlined /> 待复核整改
            {summary.my_pending_review > 0 && (
              <Tag color="warning" style={{ marginLeft: 4 }}>{summary.my_pending_review}</Tag>
            )}
          </span>
        ),
      });
    }

    return items;
  };

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>
          {record.latest_rectification_is_overdue && <WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />}
          {text}
        </a>
      ),
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '执行者',
      dataIndex: ['executor_detail', 'username'],
      key: 'executor',
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '整改状态',
      dataIndex: 'rectification_status',
      key: 'rectification_status',
      render: (status) => {
        if (!status) return <span style={{ color: '#999' }}>-</span>;
        const info = rectificationStatusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color} icon={status === 'overdue' ? <WarningOutlined /> : null}>{info.text}</Tag>;
      },
    },
    {
      title: '整改轮次',
      dataIndex: 'current_rectification_round',
      key: 'round',
      render: (round) => round ? `第${round}轮` : '-',
    },
    {
      title: '截止时间',
      key: 'deadline',
      render: (_, record) => {
        if (record.status === 'rejected') {
          return record.latest_rectification_is_overdue ? (
            <Tag color="error" icon={<WarningOutlined />}>已超期</Tag>
          ) : (
            <Tag color="success">整改中</Tag>
          );
        }
        return <Tag color="warning">待复核</Tag>;
      },
    },
    {
      title: '催办情况',
      key: 'reminder',
      render: (_, record) => (
        <Space size={4}>
          {record.reminder_count > 0 ? (
            <Tag color="#eb2f96" icon={<BellOutlined />}>{record.reminder_count}次</Tag>
          ) : (
            <span style={{ color: '#999' }}>未催办</span>
          )}
          {record.reminder_response_status === 'unresponded' && (
            <Tag color="warning">待响应</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const canRemind = (isManager() || isReviewer()) && record.status === 'rejected';
        const canRectify = isExecutor() && record.executor === user?.id && record.status === 'rejected';
        const canReview = (isReviewer() || isManager()) && record.status === 'reviewing';

        return (
          <Space size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            >
              查看详情
            </Button>
            {canRectify && (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => navigate(`/tasks/${record.id}`)}
              >
                提交整改
              </Button>
            )}
            {canReview && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => navigate(`/tasks/${record.id}`)}
              >
                去复核
              </Button>
            )}
            {canRemind && (
              <Button
                size="small"
                icon={<BellOutlined />}
                onClick={() => {
                  setSelectedTask(record);
                  setRemindModalVisible(true);
                }}
              >
                催办
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const StatCard = ({ title, value, icon, color, onClick, active }) => (
    <Card
      hoverable
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: active ? color : undefined,
        boxShadow: active ? `0 0 0 2px ${color}33` : undefined,
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Statistic
        title={title}
        value={value}
        styles={{ content: { color } }}
        prefix={icon}
      />
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>整改闭环工作台</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="整改任务总数"
            value={summary.total}
            icon={<ExclamationCircleOutlined />}
            color="#1890ff"
            onClick={() => setActiveTab('all')}
            active={activeTab === 'all'}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="整改中"
            value={summary.rectifying}
            icon={<ClockCircleOutlined />}
            color="#faad14"
            onClick={() => handleQuickFilter('rectification_status', 'rectifying')}
            active={filters.rectification_status === 'rectifying'}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="待复核"
            value={summary.pending_review}
            icon={<AuditOutlined />}
            color="#722ed1"
            onClick={() => handleQuickFilter('rectification_status', 'pending_review')}
            active={filters.rectification_status === 'pending_review'}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="已超期"
            value={summary.overdue}
            icon={<WarningOutlined />}
            color="#ff4d4f"
            onClick={() => handleQuickFilter('is_overdue', 'true')}
            active={filters.is_overdue === 'true'}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="已催办"
            value={summary.reminded}
            icon={<BellOutlined />}
            color="#eb2f96"
            onClick={() => handleQuickFilter('has_reminder', 'true')}
            active={filters.has_reminder === 'true'}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <StatCard
            title="待响应催办"
            value={summary.unresponded_reminder}
            icon={<SendOutlined />}
            color="#fa8c16"
            onClick={() => handleQuickFilter('has_unresponded_reminder', 'true')}
            active={filters.has_unresponded_reminder === 'true'}
          />
        </Col>
        {isExecutor() && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <StatCard
              title="我的待整改"
              value={summary.my_pending_rectification}
              icon={<FormOutlined />}
              color="#13c2c2"
              onClick={() => setActiveTab('my_pending_rectification')}
              active={activeTab === 'my_pending_rectification'}
            />
          </Col>
        )}
        {(isReviewer() || isManager()) && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <StatCard
              title={isManager() ? "全部待复核" : "我的待复核"}
              value={summary.my_pending_review}
              icon={<CheckCircleOutlined />}
              color="#52c41a"
              onClick={() => setActiveTab('my_pending_review')}
              active={activeTab === 'my_pending_review'}
            />
          </Col>
        )}
        {isExecutor() && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <StatCard
              title="已被催办"
              value={summary.my_reminded}
              icon={<BellOutlined />}
              color="#f5222d"
              onClick={() => setActiveTab('my_reminded')}
              active={activeTab === 'my_reminded'}
            />
          </Col>
        )}
      </Row>

      {isManager() && summary.store_stats.length > 0 && (
        <Card
          title={<span><HomeOutlined /> 门店整改概览</span>}
          style={{ marginBottom: 24 }}
          size="small"
        >
          <Row gutter={[12, 12]}>
            {summary.store_stats.map(store => (
              <Col key={store.store_id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      store_id: prev.store_id === store.store_id ? undefined : store.store_id,
                    }));
                  }}
                  style={{
                    borderColor: filters.store_id === store.store_id ? '#1890ff' : undefined,
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{store.store_name}</div>
                  <Space split={<span style={{ color: '#ddd' }}>|</span>}>
                    <span>总计: {store.total}</span>
                    <span style={{ color: '#faad14' }}>整改中: {store.rectifying}</span>
                    <span style={{ color: '#722ed1' }}>待复核: {store.pending_review}</span>
                    {store.overdue > 0 && (
                      <span style={{ color: '#ff4d4f' }}>超期: {store.overdue}</span>
                    )}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap>
            <Select
              placeholder="筛选门店"
              style={{ width: 180 }}
              allowClear
              value={filters.store_id}
              onChange={(value) => setFilters(prev => ({ ...prev, store_id: value }))}
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id}>{store.name}</Option>
              ))}
            </Select>
            {isManager() && (
              <Select
                placeholder="筛选执行者"
                style={{ width: 180 }}
                allowClear
                value={filters.executor_id}
                onChange={(value) => setFilters(prev => ({ ...prev, executor_id: value }))}
              >
                {executors.map(executor => (
                  <Option key={executor.id} value={executor.id}>{executor.username}</Option>
                ))}
              </Select>
            )}
            <Select
              placeholder="整改状态"
              style={{ width: 140 }}
              allowClear
              value={filters.rectification_status}
              onChange={(value) => setFilters(prev => ({ ...prev, rectification_status: value }))}
            >
              <Option value="rectifying">整改中</Option>
              <Option value="pending_review">待复核</Option>
              <Option value="overdue">已超期</Option>
            </Select>
            <Select
              placeholder="超期状态"
              style={{ width: 140 }}
              allowClear
              value={filters.is_overdue}
              onChange={(value) => setFilters(prev => ({ ...prev, is_overdue: value }))}
            >
              <Option value="true">已超期</Option>
              <Option value="false">未超期</Option>
            </Select>
            <Select
              placeholder="催办状态"
              style={{ width: 140 }}
              allowClear
              value={filters.has_reminder}
              onChange={(value) => setFilters(prev => ({ ...prev, has_reminder: value, has_unresponded_reminder: undefined }))}
            >
              <Option value="true">已催办</Option>
              <Option value="false">未催办</Option>
            </Select>
            {filters.has_reminder === 'true' && (
              <Select
                placeholder="响应状态"
                style={{ width: 140 }}
                allowClear
                value={filters.has_unresponded_reminder}
                onChange={(value) => setFilters(prev => ({ ...prev, has_unresponded_reminder: value }))}
              >
                <Option value="true">待响应</Option>
                <Option value="false">已响应</Option>
              </Select>
            )}
            {(filters.store_id || filters.executor_id || filters.rectification_status || filters.is_overdue !== undefined || filters.has_reminder !== undefined || filters.has_unresponded_reminder !== undefined) && (
              <Button
                type="link"
                onClick={() => setFilters({
                  store_id: undefined,
                  executor_id: undefined,
                  rectification_status: undefined,
                  is_overdue: undefined,
                  has_reminder: undefined,
                  has_unresponded_reminder: undefined,
                })}
              >
                清除筛选
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={getTabItems()} />

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="发送催办"
        open={remindModalVisible}
        onCancel={() => {
          setRemindModalVisible(false);
          remindForm.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ margin: '0 0 4px 0' }}><strong>任务：</strong>{selectedTask?.title}</p>
          <p style={{ margin: '0 0 4px 0' }}><strong>门店：</strong>{selectedTask?.store_name}</p>
          <p style={{ margin: 0 }}><strong>执行者：</strong>{selectedTask?.executor_detail?.username}</p>
        </div>

        <Form form={remindForm} layout="vertical" onFinish={handleRemind}>
          <Form.Item
            name="note"
            label="催办说明"
            rules={[{ required: true, message: '请填写催办说明' }]}
          >
            <TextArea rows={4} placeholder="请填写催办说明，提醒执行者尽快完成整改" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setRemindModalVisible(false);
                remindForm.resetFields();
                setSelectedTask(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<BellOutlined />}>
                发送催办
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Workbench;

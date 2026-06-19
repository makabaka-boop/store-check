import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Statistic,
  Modal,
  Form,
  Input,
  message,
  Tooltip
} from 'antd';
import {
  EyeOutlined,
  WarningOutlined,
  BellOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const Workbench = () => {
  const { user, isManager, isReviewer, isExecutor } = useAuth();
  const navigate = useNavigate();
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
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState([]);
  const [executors, setExecutors] = useState([]);
  const [filters, setFilters] = useState({
    store_id: undefined,
    executor_id: undefined,
    rectification_status: undefined,
    overdue_status: undefined,
    reminder_status: undefined,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [remindForm] = Form.useForm();
  const [quickFilter, setQuickFilter] = useState('all');

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

  const taskStatusMap = {
    pending: { color: 'default', text: '待执行' },
    executing: { color: 'processing', text: '执行中' },
    completed: { color: 'success', text: '已完成' },
    reviewing: { color: 'warning', text: '待复核' },
    rejected: { color: 'error', text: '需整改' },
    finished: { color: 'success', text: '已结案' },
  };

  const fetchSummary = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params[key] = value;
      });
      const response = await api.get('/tasks/workbench_summary/', { params });
      setSummary(response.data);
    } catch (error) {
      console.error('获取工作台统计失败', error);
    }
  };

  const fetchTasks = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, page_size: pagination.pageSize };
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params[key] = value;
      });
      const response = await api.get('/tasks/workbench_tasks/', { params });
      setTasks(response.data.results);
      setPagination(prev => ({
        ...prev,
        current: page,
        total: response.data.count,
      }));
    } catch (error) {
      console.error('获取工作台任务列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get('/stores/');
      setStores(response.data);
    } catch (error) {
      console.error('获取门店列表失败', error);
    }
  };

  const fetchExecutors = async () => {
    try {
      const response = await api.get('/users/executors/');
      setExecutors(response.data);
    } catch (error) {
      console.error('获取执行者列表失败', error);
    }
  };

  useEffect(() => {
    fetchStores();
    if (isManager() || isReviewer()) {
      fetchExecutors();
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchTasks(1);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleQuickFilter = (type) => {
    setQuickFilter(type);
    const newFilters = {
      store_id: undefined,
      executor_id: undefined,
      rectification_status: undefined,
      overdue_status: undefined,
      reminder_status: undefined,
    };
    switch (type) {
      case 'my_rectifying':
        newFilters.rectification_status = 'rectifying';
        break;
      case 'my_pending_review':
        newFilters.rectification_status = 'pending_review';
        break;
      case 'overdue':
        newFilters.overdue_status = 'overdue';
        break;
      case 'unresponded':
        newFilters.reminder_status = 'unresponded';
        break;
      default:
        break;
    }
    setFilters(newFilters);
  };

  const handleRemind = (task) => {
    setCurrentTask(task);
    setRemindModalVisible(true);
  };

  const handleSubmitRemind = async () => {
    try {
      const values = await remindForm.validateFields();
      await api.post(`/tasks/${currentTask.id}/remind/`, values);
      message.success('催办已发送');
      setRemindModalVisible(false);
      remindForm.resetFields();
      setCurrentTask(null);
      fetchSummary();
      fetchTasks(pagination.current);
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error('催办发送失败');
    }
  };

  const handleGoToDetail = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  const handleGoToRectifications = () => {
    navigate('/rectifications');
  };

  const handleGoToReviews = () => {
    navigate('/reviews');
  };

  const handleTableChange = (paginationInfo) => {
    fetchTasks(paginationInfo.current);
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '任务标题',
        dataIndex: 'title',
        key: 'title',
        render: (text, record) => (
          <a onClick={() => handleGoToDetail(record.id)}>{text}</a>
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
          const info = taskStatusMap[status] || { color: 'default', text: status };
          return <Tag color={info.color}>{info.text}</Tag>;
        },
      },
      {
        title: '整改状态',
        dataIndex: 'rectification_status',
        key: 'rectification_status',
        render: (status, record) => {
          if (!status) return <span style={{ color: '#999' }}>-</span>;
          const isOverdue = record.latest_rectification_is_overdue;
          const info = rectificationStatusMap[status] || { color: 'default', text: status };
          return (
            <Space>
              <Tag color={info.color} icon={isOverdue ? <WarningOutlined /> : null}>
                {info.text}
              </Tag>
              {isOverdue && <Tag color="error">超期</Tag>}
            </Space>
          );
        },
      },
      {
        title: '整改轮次',
        dataIndex: 'current_rectification_round',
        key: 'round',
        render: (round) => round ? `第${round}轮` : '-',
      },
      {
        title: '整改截止',
        key: 'deadline',
        render: (_, record) => {
          if (record.rectification_status === 'rectifying' && record.latest_rectification_deadline) {
            return (
              <span style={{ color: record.latest_rectification_is_overdue ? '#ff4d4f' : undefined }}>
                {dayjs(record.latest_rectification_deadline).format('YYYY-MM-DD HH:mm')}
                {record.latest_rectification_is_overdue && <Tag color="error" style={{ marginLeft: 8 }}>已超期</Tag>}
              </span>
            );
          }
          return <span style={{ color: '#999' }}>-</span>;
        },
      },
      {
        title: '催办状态',
        dataIndex: 'reminder_response_status',
        key: 'reminder_status',
        render: (status, record) => {
          if (record.reminder_count > 0) {
            return (
              <Space>
                <Tag color="#eb2f96" icon={<BellOutlined />}>{record.reminder_count}次</Tag>
                {status && (
                  <Tag color={reminderStatusMap[status]?.color}>
                    {reminderStatusMap[status]?.text}
                  </Tag>
                )}
              </Space>
            );
          }
          return <Tag>未催办</Tag>;
        },
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 220,
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleGoToDetail(record.id)}
            >
              详情
            </Button>
            {(isManager() || isReviewer()) && record.rectification_status === 'rectifying' && (
              <Button
                type="link"
                icon={<BellOutlined />}
                onClick={() => handleRemind(record)}
              >
                催办
              </Button>
            )}
            {isExecutor() && record.rectification_status === 'rectifying' && (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleGoToDetail(record.id)}
              >
                去整改
              </Button>
            )}
            {isReviewer() && record.rectification_status === 'pending_review' && (
              <Button
                type="primary"
                size="small"
                icon={<FileDoneOutlined />}
                onClick={() => navigate('/reviews')}
              >
                去复核
              </Button>
            )}
          </Space>
        ),
      },
    ];
    return baseColumns;
  }, [isManager, isReviewer, isExecutor, navigate]);

  const getStatisticCards = () => {
    const cards = [];

    cards.push(
      <Col xs={24} sm={12} md={8} lg={6} key="total">
        <Card hoverable onClick={() => handleQuickFilter('all')}>
          <Statistic
            title="整改任务总数"
            value={summary.total}
            prefix={<DashboardOutlined />}
            valueStyle={{ color: quickFilter === 'all' ? '#1890ff' : undefined }}
          />
        </Card>
      </Col>
    );

    if (isExecutor()) {
      cards.push(
        <Col xs={24} sm={12} md={8} lg={6} key="my_rectifying">
          <Card hoverable onClick={() => handleQuickFilter('my_rectifying')}>
            <Statistic
              title="我的待整改"
              value={summary.my_pending_rectification}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: quickFilter === 'my_rectifying' ? '#faad14' : '#faad14' }}
            />
          </Card>
        </Col>
      );
      cards.push(
        <Col xs={24} sm={12} md={8} lg={6} key="my_reminded">
          <Card hoverable onClick={() => handleQuickFilter('unresponded')}>
            <Statistic
              title="被催办任务"
              value={summary.my_reminded}
              prefix={<BellOutlined />}
              valueStyle={{ color: quickFilter === 'unresponded' ? '#eb2f96' : '#eb2f96' }}
            />
          </Card>
        </Col>
      );
    }

    if (isReviewer()) {
      cards.push(
        <Col xs={24} sm={12} md={8} lg={6} key="my_pending_review">
          <Card hoverable onClick={() => handleQuickFilter('my_pending_review')}>
            <Statistic
              title="待我复核"
              value={summary.my_pending_review}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: quickFilter === 'my_pending_review' ? '#722ed1' : '#722ed1' }}
            />
          </Card>
        </Col>
      );
    }

    if (isManager()) {
      cards.push(
        <Col xs={24} sm={12} md={8} lg={6} key="rectifying">
          <Card hoverable onClick={() => handleQuickFilter('my_rectifying')}>
            <Statistic
              title="整改中"
              value={summary.rectifying}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: quickFilter === 'my_rectifying' ? '#faad14' : '#faad14' }}
            />
          </Card>
        </Col>
      );
      cards.push(
        <Col xs={24} sm={12} md={8} lg={6} key="pending_review">
          <Card hoverable onClick={() => handleQuickFilter('my_pending_review')}>
            <Statistic
              title="待复核"
              value={summary.pending_review}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: quickFilter === 'my_pending_review' ? '#722ed1' : '#722ed1' }}
            />
          </Card>
        </Col>
      );
    }

    cards.push(
      <Col xs={24} sm={12} md={8} lg={6} key="overdue">
        <Card hoverable onClick={() => handleQuickFilter('overdue')}>
          <Statistic
            title="已超期"
            value={summary.overdue}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: quickFilter === 'overdue' ? '#ff4d4f' : '#ff4d4f' }}
          />
        </Card>
      </Col>
    );

    return cards;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>整改闭环工作台</Title>
        <Space>
          <Button onClick={handleGoToRectifications} icon={<DashboardOutlined />}>
            整改跟踪
          </Button>
          {isReviewer() && (
            <Button onClick={handleGoToReviews} icon={<FileDoneOutlined />}>
              复核任务
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {getStatisticCards()}
      </Row>

      <Card title="任务筛选" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="选择门店"
            style={{ width: 200 }}
            allowClear
            value={filters.store_id}
            onChange={(value) => handleFilterChange('store_id', value)}
          >
            {stores.map(store => (
              <Option key={store.id} value={store.id}>{store.name}</Option>
            ))}
          </Select>
          {(isManager() || isReviewer()) && (
            <Select
              placeholder="选择执行者"
              style={{ width: 200 }}
              allowClear
              value={filters.executor_id}
              onChange={(value) => handleFilterChange('executor_id', value)}
            >
              {executors.map(exec => (
                <Option key={exec.id} value={exec.id}>{exec.username}</Option>
              ))}
            </Select>
          )}
          <Select
            placeholder="整改状态"
            style={{ width: 160 }}
            allowClear
            value={filters.rectification_status}
            onChange={(value) => handleFilterChange('rectification_status', value)}
          >
            <Option value="rectifying">整改中</Option>
            <Option value="pending_review">待复核</Option>
          </Select>
          <Select
            placeholder="超期状态"
            style={{ width: 160 }}
            allowClear
            value={filters.overdue_status}
            onChange={(value) => handleFilterChange('overdue_status', value)}
          >
            <Option value="overdue">已超期</Option>
            <Option value="not_overdue">未超期</Option>
          </Select>
          <Select
            placeholder="催办状态"
            style={{ width: 160 }}
            allowClear
            value={filters.reminder_status}
            onChange={(value) => handleFilterChange('reminder_status', value)}
          >
            <Option value="no_reminder">未催办</Option>
            <Option value="unresponded">已催办未响应</Option>
            <Option value="responded">已响应</Option>
          </Select>
          <Button onClick={() => {
            setQuickFilter('all');
            setFilters({
              store_id: undefined,
              executor_id: undefined,
              rectification_status: undefined,
              overdue_status: undefined,
              reminder_status: undefined,
            });
          }}>
            重置筛选
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="发起催办"
        open={remindModalVisible}
        onOk={handleSubmitRemind}
        onCancel={() => {
          setRemindModalVisible(false);
          remindForm.resetFields();
          setCurrentTask(null);
        }}
        okText="发送催办"
        cancelText="取消"
      >
        <Form form={remindForm} layout="vertical">
          <Form.Item label="任务">
            <span>{currentTask?.title}</span>
          </Form.Item>
          <Form.Item
            name="note"
            label="催办说明"
            rules={[{ required: true, message: '请填写催办说明' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入催办说明，将发送给执行者" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Workbench;

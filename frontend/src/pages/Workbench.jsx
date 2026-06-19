import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  Input,
  message,
  Tabs
} from 'antd';
import {
  EyeOutlined,
  WarningOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  NotificationOutlined,
  SendOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Workbench = () => {
  const [summary, setSummary] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ stores: [], executors: [] });
  const [storeFilter, setStoreFilter] = useState();
  const [executorFilter, setExecutorFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  const [rectificationStatusFilter, setRectificationStatusFilter] = useState();
  const [overdueFilter, setOverdueFilter] = useState();
  const [reminderFilter, setReminderFilter] = useState();
  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [respondForm] = Form.useForm();
  const navigate = useNavigate();
  const { user, isManager, isReviewer, isExecutor } = useAuth();

  const taskStatusMap = {
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
    try {
      const response = await api.get('/workbench/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('获取工作台汇总失败', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/workbench/filter_options/');
      setFilterOptions(response.data);
    } catch (error) {
      console.error('获取筛选选项失败', error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (storeFilter) params.store_id = storeFilter;
      if (executorFilter) params.executor_id = executorFilter;
      if (statusFilter) params.status = statusFilter;
      if (rectificationStatusFilter) params.rectification_status = rectificationStatusFilter;
      if (overdueFilter) params.is_overdue = overdueFilter;
      if (reminderFilter) params.reminder_status = reminderFilter;

      const response = await api.get('/workbench/tasks/', { params });
      setTasks(response.data);
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [storeFilter, executorFilter, statusFilter, rectificationStatusFilter, overdueFilter, reminderFilter]);

  const handleRemind = async (values) => {
    try {
      await api.post(`/tasks/${selectedTask.id}/remind/`, values);
      message.success('催办成功');
      setRemindModalVisible(false);
      form.resetFields();
      setSelectedTask(null);
      fetchSummary();
      fetchTasks();
    } catch (error) {
      message.error('催办失败');
    }
  };

  const handleRespondReminder = async (values) => {
    try {
      await api.post(`/tasks/${selectedTask.id}/respond_reminder/`, {
        reminder_id: selectedTask.latest_reminder_id,
        response_note: values.response_note,
      });
      message.success('响应成功');
      setRespondModalVisible(false);
      respondForm.resetFields();
      setSelectedTask(null);
      fetchSummary();
      fetchTasks();
    } catch (error) {
      message.error('响应失败');
    }
  };

  const getQuickFilterTabs = () => {
    const items = [];

    if (isManager()) {
      items.push({ key: 'all', label: '全部整改任务' });
    }

    if (isExecutor()) {
      items.push({ key: 'my_rectifying', label: `我的待整改 (${summary.my_pending_rectification || 0})` });
      items.push({ key: 'my_reminded', label: `被催办 (${summary.my_reminded || 0})` });
    }

    if (isReviewer()) {
      items.push({ key: 'my_pending_review', label: `待我复核 (${summary.my_pending_review || 0})` });
    }

    items.push({ key: 'overdue', label: `超期任务 (${summary.overdue_count || 0})` });
    items.push({ key: 'unresponded', label: `未响应催办 (${summary.unresponded_reminder_count || 0})` });

    return items;
  };

  const [activeQuickTab, setActiveQuickTab] = useState('all');

  const handleQuickTabChange = (key) => {
    setActiveQuickTab(key);
    setStoreFilter(undefined);
    setExecutorFilter(undefined);
    setStatusFilter(undefined);
    setRectificationStatusFilter(undefined);
    setOverdueFilter(undefined);
    setReminderFilter(undefined);

    switch (key) {
      case 'my_rectifying':
        setRectificationStatusFilter('rectifying');
        break;
      case 'my_reminded':
        setReminderFilter('unresponded');
        break;
      case 'my_pending_review':
        setRectificationStatusFilter('pending_review');
        break;
      case 'overdue':
        setOverdueFilter('true');
        break;
      case 'unresponded':
        setReminderFilter('unresponded');
        break;
      default:
        break;
    }
  };

  const statCards = [
    {
      title: '整改中任务',
      value: summary.pending_rectification || 0,
      icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      color: '#e6f7ff',
      onClick: () => handleQuickTabChange(isExecutor() ? 'my_rectifying' : 'all'),
    },
    {
      title: '待复核任务',
      value: summary.pending_review || 0,
      icon: <CheckCircleOutlined style={{ color: '#faad14' }} />,
      color: '#fffbe6',
      onClick: () => handleQuickTabChange('my_pending_review'),
    },
    {
      title: '已超期任务',
      value: summary.overdue_count || 0,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      color: '#fff1f0',
      onClick: () => handleQuickTabChange('overdue'),
    },
    {
      title: '未响应催办',
      value: summary.unresponded_reminder_count || 0,
      icon: <NotificationOutlined style={{ color: '#eb2f96' }} />,
      color: '#fff0f6',
      onClick: () => handleQuickTabChange('unresponded'),
    },
  ];

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 120,
    },
    {
      title: '执行者',
      dataIndex: 'executor_name',
      key: 'executor_name',
      width: 100,
    },
    {
      title: '任务状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const info = taskStatusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '整改状态',
      dataIndex: 'rectification_status',
      key: 'rectification_status',
      width: 110,
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
      width: 90,
      render: (round) => round ? `第${round}轮` : '-',
    },
    {
      title: '整改截止',
      dataIndex: 'latest_rectification_deadline',
      key: 'deadline',
      width: 160,
      render: (date, record) => date ? (
        <span style={{ color: record.latest_rectification_is_overdue ? '#ff4d4f' : 'inherit' }}>
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
          {record.latest_rectification_is_overdue && <WarningOutlined style={{ marginLeft: 4 }} />}
        </span>
      ) : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '催办状态',
      key: 'reminder_status',
      width: 130,
      render: (_, record) => {
        if (record.reminder_count === 0) {
          return <Tag color="default">未催办</Tag>;
        }
        if (record.has_unresponded_reminder) {
          return <Tag color="warning" icon={<BellOutlined />}>已催办({record.reminder_count})</Tag>;
        }
        return <Tag color="success" icon={<BellOutlined />}>已响应</Tag>;
      },
    },
    {
      title: '最近催办',
      dataIndex: 'latest_reminder_at',
      key: 'latest_reminder_at',
      width: 160,
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            详情
          </Button>
          {(isManager() || isReviewer()) && record.status === 'rejected' && (
            <Button
              type="link"
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
          {isExecutor() && record.status === 'rejected' && (
            <Button
              type="primary"
              size="small"
              onClick={() => navigate(`/tasks/${record.id}`)}
            >
              去整改
            </Button>
          )}
          {isReviewer() && record.status === 'reviewing' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => navigate('/reviews')}
            >
              去复核
            </Button>
          )}
          {isExecutor() && record.has_unresponded_reminder && (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => {
                setSelectedTask(record);
                setRespondModalVisible(true);
              }}
            >
              响应催办
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 16px 0' }}>整改闭环工作台</Title>
        <Row gutter={16}>
          {statCards.map((card, index) => (
            <Col span={6} key={index}>
              <Card
                hoverable
                onClick={card.onClick}
                style={{ cursor: 'pointer', borderLeft: `3px solid ${card.icon.props.style?.color || '#1890ff'}` }}
                bodyStyle={{ padding: '20px' }}
              >
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={card.icon}
                  valueStyle={{ fontSize: '28px' }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <Card>
        <Tabs
          activeKey={activeQuickTab}
          onChange={handleQuickTabChange}
          items={getQuickFilterTabs()}
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Select
            placeholder="筛选门店"
            style={{ width: 180 }}
            allowClear
            value={storeFilter}
            onChange={setStoreFilter}
          >
            {filterOptions.stores?.map(store => (
              <Option key={store.id} value={store.id}>{store.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="筛选执行者"
            style={{ width: 180 }}
            allowClear
            value={executorFilter}
            onChange={setExecutorFilter}
          >
            {filterOptions.executors?.map(executor => (
              <Option key={executor.id} value={executor.id}>{executor.username}</Option>
            ))}
          </Select>
          <Select
            placeholder="任务状态"
            style={{ width: 140 }}
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
          >
            {Object.entries(taskStatusMap).map(([key, value]) => (
              <Option key={key} value={key}>{value.text}</Option>
            ))}
          </Select>
          <Select
            placeholder="整改状态"
            style={{ width: 140 }}
            allowClear
            value={rectificationStatusFilter}
            onChange={setRectificationStatusFilter}
          >
            {Object.entries(rectificationStatusMap).map(([key, value]) => (
              <Option key={key} value={key}>{value.text}</Option>
            ))}
          </Select>
          <Select
            placeholder="超期状态"
            style={{ width: 140 }}
            allowClear
            value={overdueFilter}
            onChange={setOverdueFilter}
          >
            <Option value="true">已超期</Option>
            <Option value="false">未超期</Option>
          </Select>
          <Select
            placeholder="催办状态"
            style={{ width: 160 }}
            allowClear
            value={reminderFilter}
            onChange={setReminderFilter}
          >
            {Object.entries(reminderStatusMap).map(([key, value]) => (
              <Option key={key} value={key}>{value.text}</Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="发起催办"
        open={remindModalVisible}
        onCancel={() => {
          setRemindModalVisible(false);
          form.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>任务：</strong>{selectedTask?.title}</p>
          <p><strong>门店：</strong>{selectedTask?.store_name}</p>
          <p><strong>执行者：</strong>{selectedTask?.executor_name}</p>
        </div>
        <Form form={form} layout="vertical" onFinish={handleRemind}>
          <Form.Item
            name="note"
            label="催办说明"
            rules={[{ required: true, message: '请填写催办说明' }]}
          >
            <TextArea rows={4} placeholder="请填写催办说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<BellOutlined />}>
              发送催办
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="响应催办"
        open={respondModalVisible}
        onCancel={() => {
          setRespondModalVisible(false);
          respondForm.resetFields();
          setSelectedTask(null);
        }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>任务：</strong>{selectedTask?.title}</p>
          {selectedTask?.latest_reminder_note && (
            <p><strong>催办内容：</strong>{selectedTask.latest_reminder_note}</p>
          )}
        </div>
        <Form form={respondForm} layout="vertical" onFinish={handleRespondReminder}>
          <Form.Item
            name="response_note"
            label="响应说明"
            rules={[{ required: true, message: '请填写响应说明' }]}
          >
            <TextArea rows={4} placeholder="请填写整改进度或说明" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block icon={<SendOutlined />}>
              提交响应
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Workbench;

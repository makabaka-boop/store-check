import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Typography,
  Modal,
  message,
  Empty
} from 'antd';
import {
  WarningOutlined,
  BellOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  FileSearchOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const rectificationStatusMap = {
  rectifying: { color: 'processing', text: '整改中' },
  pending_review: { color: 'warning', text: '待复核' },
  overdue: { color: 'error', text: '已超期' },
};

const taskStatusMap = {
  pending: { color: 'default', text: '待执行' },
  executing: { color: 'processing', text: '执行中' },
  completed: { color: 'success', text: '已完成' },
  reviewing: { color: 'warning', text: '待复核' },
  rejected: { color: 'error', text: '需整改' },
  finished: { color: 'success', text: '已结案' },
};

const reminderStatusMap = {
  no_reminder: { color: 'default', text: '未催办' },
  unresponded: { color: 'warning', text: '已催办未响应' },
  responded: { color: 'success', text: '已响应' },
};

const Workbench = () => {
  const navigate = useNavigate();
  const { user, isManager, isReviewer, isExecutor } = useAuth();

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storeOptions, setStoreOptions] = useState([]);
  const [executorOptions, setExecutorOptions] = useState([]);

  const defaultScope = useMemo(() => {
    if (isReviewer && isReviewer()) return 'my_pending_review';
    if (isExecutor && isExecutor()) return 'my_pending_rectify';
    return 'all_rectification';
  }, [user]);

  const [scope, setScope] = useState(defaultScope);
  const [storeFilter, setStoreFilter] = useState();
  const [executorFilter, setExecutorFilter] = useState();
  const [rectStatusFilter, setRectStatusFilter] = useState();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [remindNote, setRemindNote] = useState('');
  const [remindTarget, setRemindTarget] = useState(null);
  const [remindLoading, setRemindLoading] = useState(false);

  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [trackTask, setTrackTask] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/workbench/summary/');
      setSummary(res.data);
    } catch (e) {
      console.error('获取工作台汇总失败', e);
    }
  };

  const fetchOptions = async () => {
    try {
      const [storesRes, execRes] = await Promise.all([
        api.get('/workbench/store_options/'),
        isManager && isManager()
          ? api.get('/workbench/executor_options/')
          : Promise.resolve({ data: [] }),
      ]);
      setStoreOptions(storesRes.data || []);
      setExecutorOptions(execRes.data || []);
    } catch (e) {
      console.error('获取筛选选项失败', e);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = { scope };
      if (storeFilter) params.store_id = storeFilter;
      if (executorFilter) params.executor_id = executorFilter;
      if (rectStatusFilter) params.rectification_status = rectStatusFilter;
      if (overdueOnly) params.overdue_only = 'true';
      if (keyword) params.keyword = keyword;
      const res = await api.get('/workbench/tasks/', { params });
      setTasks(res.data);
    } catch (e) {
      message.error('获取整改任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [scope, storeFilter, executorFilter, rectStatusFilter, overdueOnly]);

  const handleRefresh = () => {
    fetchSummary();
    fetchTasks();
  };

  const openRemind = (record) => {
    setRemindTarget(record);
    setRemindNote('');
    setRemindModalVisible(true);
  };

  const submitRemind = async () => {
    if (!remindNote.trim()) {
      message.warning('请填写催办说明');
      return;
    }
    setRemindLoading(true);
    try {
      await api.post(`/tasks/${remindTarget.id}/remind/`, { note: remindNote });
      message.success('催办成功');
      setRemindModalVisible(false);
      setRemindTarget(null);
      setRemindNote('');
      handleRefresh();
    } catch (e) {
      message.error(e.response?.data?.error || '催办失败');
    } finally {
      setRemindLoading(false);
    }
  };

  const openTrack = async (record) => {
    setTrackTask(null);
    setTrackModalVisible(true);
    setTrackLoading(true);
    try {
      const res = await api.get(`/tasks/${record.id}/`);
      setTrackTask(res.data);
    } catch (e) {
      message.error('获取处理轨迹失败');
    } finally {
      setTrackLoading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    const role = summary.role;
    const cards = [];
    if (role === 'manager') {
      cards.push(
        { title: '整改任务总数', value: summary.total_rectification_tasks, color: '#1677ff', scope: 'all_rectification' },
        { title: '整改中', value: summary.rectifying_count, color: '#fa8c16', scope: 'rectifying' },
        { title: '待复核', value: summary.pending_review_count, color: '#faad14', scope: 'pending_review' },
        { title: '已超期', value: summary.overdue_count, color: '#ff4d4f', scope: 'overdue' },
        { title: '催办未响应', value: summary.reminded_unresponded_count, color: '#eb2f96', scope: 'reminded' },
        { title: '已结案', value: summary.finished_count, color: '#52c41a', scope: null }
      );
    } else if (role === 'reviewer') {
      cards.push(
        { title: '我的待复核', value: summary.my_pending_review || 0, color: '#faad14', scope: 'my_pending_review' },
        { title: '整改中', value: summary.rectifying_count, color: '#fa8c16', scope: 'rectifying' },
        { title: '已超期', value: summary.overdue_count, color: '#ff4d4f', scope: 'overdue' },
        { title: '催办未响应', value: summary.reminded_unresponded_count, color: '#eb2f96', scope: 'reminded' }
      );
    } else if (role === 'executor') {
      cards.push(
        { title: '我的待整改', value: summary.my_pending_rectify || 0, color: '#fa8c16', scope: 'my_pending_rectify' },
        { title: '已被催办', value: summary.my_reminded || 0, color: '#eb2f96', scope: 'my_reminded' },
        { title: '已超期', value: summary.overdue_count, color: '#ff4d4f', scope: 'overdue' },
        { title: '已结案', value: summary.finished_count, color: '#52c41a', scope: null }
      );
    }
    return cards;
  }, [summary]);

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)}>{text}</a>
      ),
    },
    { title: '门店', dataIndex: 'store_name', key: 'store_name' },
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
      render: (status) => {
        if (!status) return <span style={{ color: '#999' }}>-</span>;
        const info = rectificationStatusMap[status] || { color: 'default', text: status };
        return (
          <Tag color={info.color} icon={status === 'overdue' ? <WarningOutlined /> : null}>
            {info.text}
          </Tag>
        );
      },
    },
    {
      title: '整改轮次',
      dataIndex: 'current_rectification_round',
      key: 'round',
      render: (round) => (round ? `第${round}轮` : '-'),
    },
    {
      title: '催办',
      dataIndex: 'reminder_count',
      key: 'reminder_count',
      render: (count, record) => {
        if (!count) return <span style={{ color: '#999' }}>0</span>;
        const info = reminderStatusMap[record.reminder_response_status] || {};
        return (
          <Space size={4}>
            <Tag color="#eb2f96" icon={<BellOutlined />}>{count}次</Tag>
            {record.reminder_response_status && (
              <Tag color={info.color}>{info.text}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '最近整改提交',
      dataIndex: 'latest_rectification_submitted_at',
      key: 'submitted_at',
      render: (date) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : <span style={{ color: '#999' }}>未提交</span>,
    },
    {
      title: '超期',
      dataIndex: 'latest_rectification_is_overdue',
      key: 'overdue',
      render: (v) =>
        v ? (
          <Tag color="error" icon={<WarningOutlined />}>已超期</Tag>
        ) : (
          <Tag color="success">未超期</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => {
        const role = summary?.role;
        return (
          <Space size="small" wrap>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tasks/${record.id}`)}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() => openTrack(record)}
            >
              轨迹
            </Button>
            {role === 'manager' && record.status === 'rejected' && (
              <Button
                type="link"
                size="small"
                icon={<BellOutlined />}
                onClick={() => openRemind(record)}
              >
                催办
              </Button>
            )}
            {role === 'reviewer' && record.status === 'reviewing' && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => navigate('/reviews')}
              >
                去复核
              </Button>
            )}
            {role === 'executor' && record.status === 'rejected' && (
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/tasks/${record.id}`)}
              >
                提交整改
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const role = summary?.role;
  const showExecutorFilter = role === 'manager';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <AppstoreOutlined /> 整改闭环工作台
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>刷新</Button>
          <Button onClick={() => navigate('/rectifications')}>整改跟踪</Button>
          {role === 'reviewer' && (
            <Button type="primary" onClick={() => navigate('/reviews')}>复核任务</Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {summaryCards.map((card) => (
          <Col xs={12} sm={8} md={6} lg={4} key={card.title}>
            <Card
              hoverable={!!card.scope}
              onClick={() => card.scope && setScope(card.scope)}
              style={{
                borderColor: scope === card.scope ? card.color : undefined,
                cursor: card.scope ? 'pointer' : 'default',
              }}
            >
              <Statistic title={card.title} value={card.value} valueStyle={{ color: card.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      {role === 'manager' && summary?.store_breakdown?.length > 0 && (
        <Card
          size="small"
          title={<span><AppstoreOutlined /> 门店整改风险概览（前 10）</span>}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[8, 8]}>
            {summary.store_breakdown.map((s) => (
              <Col xs={24} sm={12} md={8} lg={6} key={s.store_id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => {
                    setStoreFilter(s.store_id);
                    setScope('all_rectification');
                  }}
                  style={{
                    borderLeft: `4px solid ${s.overdue > 0 ? '#ff4d4f' : s.rectifying > 0 ? '#fa8c16' : '#52c41a'}`,
                  }}
                >
                  <Text strong>{s.store_name}</Text>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <Space size={6} wrap>
                      <span>共 {s.total}</span>
                      <Tag color="processing">整改 {s.rectifying}</Tag>
                      <Tag color="warning">待复核 {s.pending_review}</Tag>
                      {s.overdue > 0 && <Tag color="error">超期 {s.overdue}</Tag>}
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="任务范围"
            style={{ width: 180 }}
            value={scope}
            onChange={setScope}
          >
            <Option value="all_rectification">全部整改任务</Option>
            <Option value="rectifying">整改中</Option>
            <Option value="pending_review">待复核</Option>
            <Option value="overdue">已超期</Option>
            <Option value="reminded">已催办</Option>
            {role === 'executor' && <Option value="my_pending_rectify">我的待整改</Option>}
            {role === 'executor' && <Option value="my_reminded">我已被催办</Option>}
            {role === 'reviewer' && <Option value="my_pending_review">我的待复核</Option>}
          </Select>

          <Select
            placeholder="按门店筛选"
            style={{ width: 180 }}
            allowClear
            value={storeFilter}
            onChange={setStoreFilter}
            showSearch
            optionFilterProp="children"
          >
            {storeOptions.map((s) => (
              <Option key={s.id} value={s.id}>{s.name}</Option>
            ))}
          </Select>

          {showExecutorFilter && (
            <Select
              placeholder="按执行者筛选"
              style={{ width: 180 }}
              allowClear
              value={executorFilter}
              onChange={setExecutorFilter}
              showSearch
              optionFilterProp="children"
            >
              {executorOptions.map((u) => (
                <Option key={u.id} value={u.id}>{u.username}</Option>
              ))}
            </Select>
          )}

          <Select
            placeholder="整改状态"
            style={{ width: 160 }}
            allowClear
            value={rectStatusFilter}
            onChange={setRectStatusFilter}
          >
            {Object.entries(rectificationStatusMap).map(([k, v]) => (
              <Option key={k} value={k}>{v.text}</Option>
            ))}
          </Select>

          <Select
            placeholder="超期筛选"
            style={{ width: 140 }}
            allowClear
            value={overdueOnly ? 'true' : undefined}
            onChange={(v) => setOverdueOnly(v === 'true')}
          >
            <Option value="true">仅看已超期</Option>
          </Select>

          <Input.Search
            placeholder="搜索任务/门店"
            allowClear
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={fetchTasks}
          />
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
        locale={{ emptyText: <Empty description="暂无符合条件的整改任务" /> }}
      />

      <Modal
        title="发起催办"
        open={remindModalVisible}
        onCancel={() => setRemindModalVisible(false)}
        onOk={submitRemind}
        confirmLoading={remindLoading}
        okText="发送催办"
      >
        {remindTarget && (
          <div style={{ marginBottom: 12 }}>
            <p><strong>任务：</strong>{remindTarget.title}</p>
            <p><strong>门店：</strong>{remindTarget.store_name}</p>
            <p><strong>执行者：</strong>{remindTarget.executor_detail?.username}</p>
          </div>
        )}
        <TextArea
          rows={4}
          value={remindNote}
          onChange={(e) => setRemindNote(e.target.value)}
          placeholder="请填写催办说明（必填）"
        />
      </Modal>

      <Modal
        title="处理轨迹"
        open={trackModalVisible}
        onCancel={() => setTrackModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setTrackModalVisible(false)}>关闭</Button>
            {trackTask && (
              <Button type="primary" onClick={() => navigate(`/tasks/${trackTask.id}`)}>
                查看详情
              </Button>
            )}
          </Space>
        }
        width={680}
      >
        {trackLoading || !trackTask ? (
          <Empty description="加载中..." />
        ) : (
          <div>
            <p><strong>任务：</strong>{trackTask.title}</p>
            <p><strong>门店：</strong>{trackTask.store_detail?.name}</p>
            <p><strong>执行者：</strong>{trackTask.executor_detail?.username}</p>
            <div style={{ marginTop: 12 }}>
              {(trackTask.timeline || []).map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderLeft: '3px solid #1677ff',
                    background: '#f5faff',
                    marginBottom: 8,
                  }}
                >
                  <Space>
                    <ExclamationCircleOutlined style={{ color: '#1677ff' }} />
                    <strong>{ev.label}</strong>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {ev.time ? dayjs(ev.time).format('YYYY-MM-DD HH:mm') : ''}
                    </Text>
                  </Space>
                  {ev.detail && (
                    <div style={{ color: '#666', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {ev.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Workbench;

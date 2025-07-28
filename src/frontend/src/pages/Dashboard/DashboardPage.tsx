import React from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag } from 'antd';
import { 
  ShoppingOutlined, 
  ImportOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { ImportStatistics, ImportHistory } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const { data: statistics } = useQuery<{ success: boolean; data: { total: ImportStatistics } }>(
    'import-statistics',
    () => api.get('/external-stock/statistics').then(res => res.data)
  );

  const { data: recentImports } = useQuery<{ success: boolean; data: ImportHistory[] }>(
    'recent-imports',
    () => api.get('/external-stock/history?size=5').then(res => res.data)
  );

  const getStatusTag = (status: string) => {
    const statusMap = {
      'completed': { color: 'green', text: '完了' },
      'completed_with_errors': { color: 'orange', text: 'エラーあり完了' },
      'failed': { color: 'red', text: '失敗' },
      'processing': { color: 'blue', text: '処理中' },
      'uploaded': { color: 'purple', text: 'アップロード済み' }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '取込No',
      dataIndex: 'import_no',
      key: 'import_no',
      width: 100,
    },
    {
      title: '仕入先',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'ファイル名',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '取込日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
  ];

  const stats = statistics?.data?.total;

  return (
    <div>
      <Title level={2}>ダッシュボード</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="総取込回数"
              value={stats?.total_imports || 0}
              prefix={<ImportOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功取込"
              value={stats?.completed_imports || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="エラーあり完了"
              value={stats?.completed_with_errors || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="処理済み行数"
              value={stats?.total_rows_processed || 0}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="最近の取込履歴" size="small">
            <Table
              dataSource={recentImports?.data || []}
              columns={columns}
              rowKey="import_no"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="処理統計" size="small">
            <Row gutter={[8, 8]}>
              <Col span={24}>
                <Statistic
                  title="成功率"
                  value={stats ? Math.round((stats.completed_imports / stats.total_imports) * 100) : 0}
                  suffix="%"
                  valueStyle={{ 
                    color: stats && (stats.completed_imports / stats.total_imports) > 0.8 ? '#52c41a' : '#faad14' 
                  }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="エラー行数"
                  value={stats?.total_error_rows || 0}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Upload, 
  Button, 
  Select, 
  Table, 
  Tag, 
  Space,
  Modal,
  Row,
  Col,
  message
} from 'antd';
import { 
  UploadOutlined, 
  EyeOutlined, 
  RedoOutlined, 
  DeleteOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { ImportHistory, ImportError, PaginatedResponse } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const ImportPage: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [uploadFile, setUploadFile] = useState<any>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [selectedImportNo, setSelectedImportNo] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ page: 1, size: 20 });

  const queryClient = useQueryClient();

  const { data: importHistory, isLoading } = useQuery<PaginatedResponse<ImportHistory[]>>(
    ['import-history', pagination],
    () => {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString()
      });
      return api.get(`/external-stock/history?${params.toString()}`).then(res => res.data);
    }
  );

  const { data: importErrors } = useQuery<PaginatedResponse<ImportError[]>>(
    ['import-errors', selectedImportNo],
    () => selectedImportNo ? 
      api.get(`/external-stock/errors?import_no=${selectedImportNo}`).then(res => res.data) : 
      Promise.resolve(null),
    { enabled: !!selectedImportNo }
  );

  const uploadMutation = useMutation(
    ({ supplier, file }: { supplier: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('supplier', supplier);
      return api.post('/external-stock/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    {
      onSuccess: () => {
        message.success('ファイルがアップロードされました');
        setUploadFile(null);
        setSelectedSupplier('');
        queryClient.invalidateQueries('import-history');
      },
    }
  );

  const retryMutation = useMutation(
    (importNo: number) => api.post(`/external-stock/retry/${importNo}`),
    {
      onSuccess: () => {
        message.success('再取込を開始しました');
        queryClient.invalidateQueries('import-history');
      },
    }
  );

  const deleteMutation = useMutation(
    (importNo: number) => api.delete(`/external-stock/${importNo}`),
    {
      onSuccess: () => {
        message.success('取込データを削除しました');
        queryClient.invalidateQueries('import-history');
      },
    }
  );

  const handleUpload = () => {
    if (!selectedSupplier || !uploadFile) {
      message.error('仕入先とファイルを選択してください');
      return;
    }
    uploadMutation.mutate({ supplier: selectedSupplier, file: uploadFile });
  };

  const handleViewErrors = (importNo: number) => {
    setSelectedImportNo(importNo);
    setErrorModalVisible(true);
  };

  const handleRetry = (importNo: number) => {
    Modal.confirm({
      title: '再取込の確認',
      content: '選択した取込データを再処理しますか？',
      onOk: () => retryMutation.mutate(importNo),
    });
  };

  const handleDelete = (importNo: number) => {
    Modal.confirm({
      title: '削除の確認',
      content: '選択した取込データを削除しますか？この操作は取り消せません。',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(importNo),
    });
  };

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
      width: 120,
    },
    {
      title: 'ファイル名',
      dataIndex: 'file_name',
      key: 'file_name',
      ellipsis: true,
    },
    {
      title: 'ファイル種別',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 100,
      render: (type: string) => type === 'stock' ? '在庫' : '単価',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '総行数',
      dataIndex: 'total_rows',
      key: 'total_rows',
      width: 80,
      render: (rows: number) => rows || '-',
    },
    {
      title: '成功行数',
      dataIndex: 'success_rows',
      key: 'success_rows',
      width: 80,
      render: (rows: number) => rows || '-',
    },
    {
      title: 'エラー行数',
      dataIndex: 'error_rows',
      key: 'error_rows',
      width: 80,
      render: (rows: number) => rows || '-',
    },
    {
      title: '取込日時',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (record: ImportHistory) => (
        <Space size="small">
          {record.error_rows && record.error_rows > 0 && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewErrors(record.import_no)}
            >
              エラー
            </Button>
          )}
          {record.status !== 'processing' && (
            <Button
              size="small"
              icon={<RedoOutlined />}
              onClick={() => handleRetry(record.import_no)}
            >
              再取込
            </Button>
          )}
          {record.status !== 'processing' && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.import_no)}
            >
              削除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const errorColumns = [
    {
      title: '行番号',
      dataIndex: 'row_no',
      key: 'row_no',
      width: 80,
    },
    {
      title: '項目',
      dataIndex: 'field',
      key: 'field',
      width: 120,
    },
    {
      title: 'エラー内容',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true,
    },
  ];

  return (
    <div>
      <Title level={2}>取込データ管理</Title>

      <Card title="ファイルアップロード" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Select
              placeholder="仕入先を選択"
              style={{ width: '100%' }}
              value={selectedSupplier}
              onChange={setSelectedSupplier}
            >
              <Option value="supplier_a">仕入先A</Option>
              <Option value="supplier_b">仕入先B</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file);
                return false;
              }}
              fileList={uploadFile ? [uploadFile] : []}
              onRemove={() => setUploadFile(null)}
            >
              <Button icon={<UploadOutlined />}>
                ファイル選択
              </Button>
            </Upload>
          </Col>
          <Col xs={24} sm={4}>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={uploadMutation.isLoading}
              disabled={!selectedSupplier || !uploadFile}
            >
              アップロード
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="取込履歴">
        <Table
          dataSource={importHistory?.data || []}
          columns={columns}
          rowKey="import_no"
          loading={isLoading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.size,
            total: importHistory?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / ${total}件`,
          }}
          onChange={(pag) => {
            setPagination({
              page: pag.current || 1,
              size: pag.pageSize || 20
            });
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="エラー詳細"
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          dataSource={importErrors?.data || []}
          columns={errorColumns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
          }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default ImportPage;
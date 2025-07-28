import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Select, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input,
  InputNumber,
  message,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExperimentOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { MappingRule } from '../../types';

// const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface BasicMappingPageProps {
  selectedSupplier: string;
  setSelectedSupplier: (supplier: string) => void;
}

const BasicMappingPage: React.FC<BasicMappingPageProps> = ({ 
  selectedSupplier, 
  setSelectedSupplier 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<MappingRule | null>(null);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  const queryClient = useQueryClient();

  const { data: mappingRules, isLoading } = useQuery<{ success: boolean; data: MappingRule[] }>(
    ['mapping-rules', selectedSupplier],
    () => api.get(`/mapping-rules?supplier=${selectedSupplier}`).then(res => res.data),
    { enabled: !!selectedSupplier }
  );

  const saveMutation = useMutation(
    (rules: any) => api.post('/mapping-rules', rules),
    {
      onSuccess: () => {
        message.success('マッピングルールを保存しました');
        queryClient.invalidateQueries('mapping-rules');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: number) => api.delete(`/mapping-rules/${id}`),
    {
      onSuccess: () => {
        message.success('マッピングルールを削除しました');
        queryClient.invalidateQueries('mapping-rules');
      },
    }
  );

  const testMutation = useMutation(
    ({ supplier, sample_data }: { supplier: string; sample_data: any }) =>
      api.post('/mapping-rules/test', { supplier, sample_data }),
    {
      onSuccess: (response) => {
        const { data } = response.data;
        Modal.info({
          title: 'マッピングテスト結果',
          width: 600,
          content: (
            <div>
              <h4>マッピング結果:</h4>
              <pre style={{ background: '#f5f5f5', padding: 8, fontSize: 12 }}>
                {JSON.stringify(data.mapped_data, null, 2)}
              </pre>
              {data.warnings && data.warnings.length > 0 && (
                <>
                  <h4>警告:</h4>
                  <ul>
                    {data.warnings.map((warning: string, index: number) => (
                      <li key={index} style={{ color: 'orange' }}>{warning}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ),
        });
      },
    }
  );

  const handleSaveRules = () => {
    const rules = mappingRules?.data || [];
    saveMutation.mutate({
      supplier: selectedSupplier,
      rules: rules.map(rule => ({
        file_field: rule.file_field,
        db_field: rule.db_field,
        type: rule.type,
        condition: rule.condition,
        fixed_value: rule.fixed_value,
        priority: rule.priority
      }))
    });
  };

  const handleAddRule = () => {
    setEditingRule(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditRule = (rule: MappingRule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setModalVisible(true);
  };

  const handleDeleteRule = (id: number) => {
    Modal.confirm({
      title: '削除の確認',
      content: 'このマッピングルールを削除しますか？',
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      queryClient.setQueryData(['mapping-rules', selectedSupplier], (old: any) => {
        if (!old) return old;
        
        const newRules = [...(old.data || [])];
        if (editingRule) {
          const index = newRules.findIndex(r => r.id === editingRule.id);
          if (index >= 0) {
            newRules[index] = { ...newRules[index], ...values };
          }
        } else {
          newRules.push({
            id: Date.now(),
            supplier: selectedSupplier,
            ...values,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        return { ...old, data: newRules };
      });
      
      setModalVisible(false);
      message.info('ルールを追加しました。「保存」ボタンで確定してください。');
    });
  };

  const handleTestMapping = () => {
    testForm.validateFields().then(values => {
      try {
        const sampleData = JSON.parse(values.sample_data);
        testMutation.mutate({
          supplier: selectedSupplier,
          sample_data: sampleData
        });
      } catch (error) {
        message.error('サンプルデータのJSON形式が正しくありません');
      }
    });
  };

  const handleExportRules = async () => {
    try {
      const response = await api.get(`/mapping-rules/export/${selectedSupplier}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mapping_rules_${selectedSupplier}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns = [
    {
      title: 'ファイル項目',
      dataIndex: 'file_field',
      key: 'file_field',
    },
    {
      title: 'DB項目',
      dataIndex: 'db_field',
      key: 'db_field',
    },
    {
      title: 'データ型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '変換条件',
      dataIndex: 'condition',
      key: 'condition',
      render: (condition: string) => (
        <div style={{ maxWidth: 200, wordBreak: 'break-all' }}>
          {condition || '-'}
        </div>
      ),
    },
    {
      title: '固定値',
      dataIndex: 'fixed_value',
      key: 'fixed_value',
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: MappingRule) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            編集
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRule(record.id)}
          >
            削除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Select
            value={selectedSupplier}
            onChange={setSelectedSupplier}
            style={{ width: '100%' }}
          >
            <Option value="supplier_a">仕入先A</Option>
            <Option value="supplier_b">仕入先B</Option>
          </Select>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRule}
          >
            新規ルール追加
          </Button>
        </Col>
        <Col>
          <Button
            onClick={handleSaveRules}
            loading={saveMutation.isLoading}
          >
            保存
          </Button>
        </Col>
        <Col>
          <Button
            icon={<ExperimentOutlined />}
            onClick={() => setTestModalVisible(true)}
          >
            テスト
          </Button>
        </Col>
        <Col>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportRules}
          >
            エクスポート
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={mappingRules?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* ルール作成・編集モーダル */}
      <Modal
        title={editingRule ? 'ルール編集' : '新規ルール作成'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleModalOk}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="file_field"
            label="ファイル項目名"
            rules={[{ required: true, message: 'ファイル項目名を入力してください' }]}
          >
            <Input placeholder="part_number" />
          </Form.Item>
          
          <Form.Item
            name="db_field"
            label="DB項目名"
            rules={[{ required: true, message: 'DB項目名を入力してください' }]}
          >
            <Select placeholder="supplier_part_no">
              <Option value="supplier_part_no">supplier_part_no</Option>
              <Option value="supplier_maker">supplier_maker</Option>
              <Option value="stock">stock</Option>
              <Option value="price">price</Option>
              <Option value="moq">moq</Option>
              <Option value="spq">spq</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="type"
            label="データ型"
            rules={[{ required: true, message: 'データ型を選択してください' }]}
          >
            <Select placeholder="string">
              <Option value="string">string</Option>
              <Option value="integer">integer</Option>
              <Option value="decimal">decimal</Option>
              <Option value="boolean">boolean</Option>
              <Option value="date">date</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="condition"
            label="変換条件（JavaScript式）"
          >
            <TextArea
              rows={3}
              placeholder="例: parseFloat(value) * 150"
            />
          </Form.Item>
          
          <Form.Item
            name="fixed_value"
            label="固定値"
          >
            <Input placeholder="固定値がある場合" />
          </Form.Item>
          
          <Form.Item
            name="priority"
            label="優先度"
            rules={[{ required: true, message: '優先度を入力してください' }]}
          >
            <InputNumber min={1} max={100} />
          </Form.Item>
        </Form>
      </Modal>

      {/* テストモーダル */}
      <Modal
        title="マッピングテスト"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={handleTestMapping}
        confirmLoading={testMutation.isLoading}
      >
        <Form
          form={testForm}
          layout="vertical"
        >
          <Form.Item
            name="sample_data"
            label="サンプルデータ（JSON形式）"
            rules={[{ required: true, message: 'サンプルデータを入力してください' }]}
          >
            <TextArea
              rows={8}
              placeholder={JSON.stringify({
                part_number: "ABC-123",
                maker_name: "SONY",
                stock_qty: "100",
                unit_price: "1500"
              }, null, 2)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BasicMappingPage;
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
  message,
  Row,
  Col,
  Tabs,
  Tag,
  Popconfirm,
  Alert,
  InputNumber,
  Switch
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExperimentOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface AdvancedRule {
  id: number;
  supplier: string;
  rule_name: string;
  rule_type: string;
  source_field: string;
  target_field: string;
  conditions: any[];
  priority: number;
  is_active: boolean;
}

interface ValueMapping {
  from_value: string;
  to_value: string;
  match_type: 'exact' | 'contains' | 'regex';
}

interface SkipCondition {
  field: string;
  operator: string;
  value: string;
  logic_operator?: 'AND' | 'OR';
}

const AdvancedMappingPage: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState('supplier_a');
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [ruleType, setRuleType] = useState<string>('value_mapping');
  const [editingRule, setEditingRule] = useState<AdvancedRule | null>(null);
  
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  const queryClient = useQueryClient();

  const { data: advancedRules, isLoading } = useQuery<{ success: boolean; data: AdvancedRule[] }>(
    ['advanced-mapping-rules', selectedSupplier],
    () => api.get(`/advanced-mapping?supplier=${selectedSupplier}`).then(res => res.data),
    { enabled: !!selectedSupplier }
  );

  const createRuleMutation = useMutation(
    ({ type, data }: { type: string; data: any }) => 
      api.post(`/advanced-mapping/${type}`, data),
    {
      onSuccess: () => {
        message.success('高度なマッピングルールを作成しました');
        queryClient.invalidateQueries('advanced-mapping-rules');
        setModalVisible(false);
        form.resetFields();
      },
      onError: (error: any) => {
        message.error(error.response?.data?.error || 'ルール作成に失敗しました');
      }
    }
  );

  const deleteRuleMutation = useMutation(
    (id: number) => api.delete(`/advanced-mapping/${id}`),
    {
      onSuccess: () => {
        message.success('ルールを削除しました');
        queryClient.invalidateQueries('advanced-mapping-rules');
      },
    }
  );

  const testRuleMutation = useMutation(
    (testData: { supplier: string; sample_data: any }) =>
      api.post('/advanced-mapping/test', testData),
    {
      onSuccess: (response) => {
        const { data } = response.data;
        Modal.info({
          title: '高度なマッピングテスト結果',
          width: 800,
          content: (
            <div>
              <Row gutter={16}>
                <Col span={12}>
                  <h4>元データ:</h4>
                  <pre style={{ background: '#f5f5f5', padding: 8, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                    {JSON.stringify(data.original_data, null, 2)}
                  </pre>
                </Col>
                <Col span={12}>
                  <h4>変換後データ:</h4>
                  <pre style={{ background: '#e6f7ff', padding: 8, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                    {JSON.stringify(data.processed_data, null, 2)}
                  </pre>
                </Col>
              </Row>
              {data.should_skip && (
                <Alert
                  message="スキップ条件に該当"
                  description="このデータは条件スキップルールにより取り込み対象外となります"
                  type="warning"
                  style={{ marginTop: 16 }}
                />
              )}
              {data.errors && data.errors.length > 0 && (
                <Alert
                  message="エラー情報"
                  description={
                    <ul>
                      {data.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  style={{ marginTop: 16 }}
                />
              )}
            </div>
          ),
        });
      },
    }
  );

  const columns = [
    {
      title: 'ルール名',
      dataIndex: 'rule_name',
      key: 'rule_name',
    },
    {
      title: 'ルール種別',
      dataIndex: 'rule_type',
      key: 'rule_type',
      render: (type: string) => {
        const typeMap: { [key: string]: { label: string; color: string } } = {
          'value_mapping': { label: '値マッピング', color: 'blue' },
          'conditional_skip': { label: '条件スキップ', color: 'orange' },
          'calculation': { label: '計算', color: 'green' },
          'text_transform': { label: 'テキスト変換', color: 'purple' }
        };
        const config = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: '対象フィールド',
      key: 'fields',
      render: (record: AdvancedRule) => (
        <span>
          {record.source_field && <Tag>{record.source_field}</Tag>}
          {record.target_field && (
            <>
              <span> → </span>
              <Tag color="green">{record.target_field}</Tag>
            </>
          )}
        </span>
      )
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '状態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '有効' : '無効'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: AdvancedRule) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="ルールを削除しますか？"
            onConfirm={() => deleteRuleMutation.mutate(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              削除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const handleCreateRule = (values: any) => {
    const baseData = {
      supplier: selectedSupplier,
      rule_name: values.rule_name,
    };

    let requestData;
    let endpoint;

    switch (ruleType) {
      case 'value_mapping':
        endpoint = 'value-mapping';
        requestData = {
          ...baseData,
          source_field: values.source_field,
          target_field: values.target_field,
          mappings: values.mappings || []
        };
        break;
      case 'conditional_skip':
        endpoint = 'conditional-skip';
        requestData = {
          ...baseData,
          conditions: values.conditions || []
        };
        break;
      case 'calculation':
        endpoint = 'calculation';
        requestData = {
          ...baseData,
          source_field: values.source_field,
          target_field: values.target_field,
          formula: values.formula,
          variables: values.variables?.split(',').map((v: string) => v.trim()) || []
        };
        break;
      case 'text_transform':
        endpoint = 'text-transform';
        requestData = {
          ...baseData,
          source_field: values.source_field,
          target_field: values.target_field,
          transform_type: values.transform_type,
          parameters: values.parameters ? JSON.parse(values.parameters) : {}
        };
        break;
      default:
        return;
    }

    createRuleMutation.mutate({ type: endpoint, data: requestData });
  };

  const handleEditRule = (rule: AdvancedRule) => {
    setEditingRule(rule);
    setRuleType(rule.rule_type);
    setModalVisible(true);
    
    // フォームにデータを設定
    form.setFieldsValue({
      rule_name: rule.rule_name,
      source_field: rule.source_field,
      target_field: rule.target_field,
      mappings: rule.conditions,
      conditions: rule.conditions,
      formula: rule.conditions[0]?.formula,
      variables: rule.conditions[0]?.variables?.join(', '),
      transform_type: rule.conditions[0]?.transform_type,
      parameters: JSON.stringify(rule.conditions[0]?.parameters || {})
    });
  };

  const handleTestRules = (values: any) => {
    try {
      const sampleData = JSON.parse(values.sample_data);
      testRuleMutation.mutate({
        supplier: selectedSupplier,
        sample_data: sampleData
      });
    } catch (error) {
      message.error('サンプルデータのJSONフォーマットが正しくありません');
    }
  };

  const renderRuleTypeForm = () => {
    switch (ruleType) {
      case 'value_mapping':
        return (
          <>
            <Form.Item
              name="source_field"
              label="元フィールド名"
              rules={[{ required: true, message: '元フィールド名を入力してください' }]}
            >
              <Input placeholder="maker_name" />
            </Form.Item>
            <Form.Item
              name="target_field"
              label="変換先フィールド名"
              rules={[{ required: true, message: '変換先フィールド名を入力してください' }]}
            >
              <Input placeholder="supplier_maker" />
            </Form.Item>
            <Form.List name="mappings">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" style={{ marginBottom: 8 }}>
                      <Row gutter={8}>
                        <Col span={7}>
                          <Form.Item
                            {...restField}
                            name={[name, 'from_value']}
                            label="変換前の値"
                            rules={[{ required: true, message: '変換前の値を入力' }]}
                          >
                            <Input placeholder="SONY" />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item
                            {...restField}
                            name={[name, 'to_value']}
                            label="変換後の値"
                            rules={[{ required: true, message: '変換後の値を入力' }]}
                          >
                            <Input placeholder="ソニー" />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'match_type']}
                            label="マッチ方法"
                            initialValue="exact"
                          >
                            <Select>
                              <Option value="exact">完全一致</Option>
                              <Option value="contains">部分一致</Option>
                              <Option value="regex">正規表現</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button
                            type="dashed"
                            danger
                            onClick={() => remove(name)}
                            style={{ marginTop: 30 }}
                          >
                            削除
                          </Button>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      マッピング追加
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        );

      case 'conditional_skip':
        return (
          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={8}>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'field']}
                          label="フィールド名"
                          rules={[{ required: true, message: 'フィールド名を入力' }]}
                        >
                          <Input placeholder="stock_qty" />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'operator']}
                          label="条件"
                          rules={[{ required: true, message: '条件を選択' }]}
                        >
                          <Select>
                            <Option value="equals">等しい</Option>
                            <Option value="not_equals">等しくない</Option>
                            <Option value="greater_than">より大きい</Option>
                            <Option value="less_than">より小さい</Option>
                            <Option value="contains">含む</Option>
                            <Option value="not_contains">含まない</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'value']}
                          label="値"
                          rules={[{ required: true, message: '値を入力' }]}
                        >
                          <Input placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'logic_operator']}
                          label="論理演算"
                        >
                          <Select allowClear>
                            <Option value="AND">AND</Option>
                            <Option value="OR">OR</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Button
                          type="dashed"
                          danger
                          onClick={() => remove(name)}
                          style={{ marginTop: 30 }}
                        >
                          削除
                        </Button>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    条件追加
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        );

      case 'calculation':
        return (
          <>
            <Form.Item
              name="source_field"
              label="計算対象フィールド"
              rules={[{ required: true, message: '計算対象フィールドを入力してください' }]}
            >
              <Input placeholder="unit_price_usd" />
            </Form.Item>
            <Form.Item
              name="target_field"
              label="結果格納フィールド"
              rules={[{ required: true, message: '結果格納フィールドを入力してください' }]}
            >
              <Input placeholder="price" />
            </Form.Item>
            <Form.Item
              name="formula"
              label="計算式"
              rules={[{ required: true, message: '計算式を入力してください' }]}
            >
              <Input placeholder="unit_price_usd * 150" />
            </Form.Item>
            <Form.Item
              name="variables"
              label="使用変数（カンマ区切り）"
              rules={[{ required: true, message: '使用変数を入力してください' }]}
            >
              <Input placeholder="unit_price_usd" />
            </Form.Item>
          </>
        );

      case 'text_transform':
        return (
          <>
            <Form.Item
              name="source_field"
              label="変換対象フィールド"
              rules={[{ required: true, message: '変換対象フィールドを入力してください' }]}
            >
              <Input placeholder="part_number" />
            </Form.Item>
            <Form.Item
              name="target_field"
              label="変換結果フィールド"
              rules={[{ required: true, message: '変換結果フィールドを入力してください' }]}
            >
              <Input placeholder="supplier_part_no" />
            </Form.Item>
            <Form.Item
              name="transform_type"
              label="変換種別"
              rules={[{ required: true, message: '変換種別を選択してください' }]}
            >
              <Select>
                <Option value="uppercase">大文字変換</Option>
                <Option value="lowercase">小文字変換</Option>
                <Option value="trim">空白除去</Option>
                <Option value="replace">文字置換</Option>
                <Option value="substring">文字抽出</Option>
                <Option value="custom">カスタム変換</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="parameters"
              label="変換パラメータ（JSON形式）"
            >
              <TextArea
                rows={3}
                placeholder='{"from": "-", "to": ""}'
              />
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>高度なマッピングルール設定</Title>
      <Paragraph>
        <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
        より柔軟なデータ変換ルールを GUI で設定できます。メーカー名統一、条件スキップ、計算、テキスト変換などに対応しています。
      </Paragraph>

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
            onClick={() => {
              setEditingRule(null);
              setModalVisible(true);
              form.resetFields();
            }}
          >
            新規ルール作成
          </Button>
        </Col>
        <Col>
          <Button
            icon={<ExperimentOutlined />}
            onClick={() => {
              setTestModalVisible(true);
              testForm.resetFields();
            }}
          >
            ルールテスト
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={advancedRules?.data || []}
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
        onCancel={() => {
          setModalVisible(false);
          setEditingRule(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
        confirmLoading={createRuleMutation.isLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRule}
        >
          <Form.Item
            name="rule_name"
            label="ルール名"
            rules={[{ required: true, message: 'ルール名を入力してください' }]}
          >
            <Input placeholder="メーカー名統一" />
          </Form.Item>

          <Form.Item label="ルール種別">
            <Select
              value={ruleType}
              onChange={setRuleType}
              disabled={!!editingRule}
            >
              <Option value="value_mapping">値マッピング（メーカー名統一など）</Option>
              <Option value="conditional_skip">条件スキップ（特定条件のデータ除外）</Option>
              <Option value="calculation">計算（価格変換など）</Option>
              <Option value="text_transform">テキスト変換（型番正規化など）</Option>
            </Select>
          </Form.Item>

          {renderRuleTypeForm()}
        </Form>
      </Modal>

      {/* ルールテストモーダル */}
      <Modal
        title="ルールテスト"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={() => testForm.submit()}
        confirmLoading={testRuleMutation.isLoading}
      >
        <Form
          form={testForm}
          layout="vertical"
          onFinish={handleTestRules}
        >
          <Form.Item
            name="sample_data"
            label="サンプルデータ（JSON形式）"
            rules={[{ required: true, message: 'サンプルデータを入力してください' }]}
          >
            <TextArea
              rows={10}
              placeholder={JSON.stringify({
                maker_name: "SONY",
                stock_qty: "100",
                unit_price_usd: "10.50",
                part_number: "ABC-123"
              }, null, 2)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdvancedMappingPage;
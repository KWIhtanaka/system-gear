import React, { useState } from 'react';
import { 
  Typography, 
  Table, 
  Input, 
  Button, 
  Space, 
  Card,
  Row,
  Col,
  Tag
} from 'antd';
import { SearchOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { Product, PaginatedResponse } from '../../types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;

const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    name: '',
    model: '',
    supplier: '',
    page: 1,
    size: 20
  });

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<Product[]>>(
    ['products', searchParams],
    () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
          params.append(key, value.toString());
        }
      });
      return api.get(`/products?${params.toString()}`).then(res => res.data);
    }
  );

  const handleSearch = (field: string, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  const handleClearAll = () => {
    setSearchParams({
      name: '',
      model: '',
      supplier: '',
      page: 1,
      size: 20
    });
  };

  const handleTableChange = (pagination: any) => {
    setSearchParams(prev => ({
      ...prev,
      page: pagination.current,
      size: pagination.pageSize
    }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchParams.name) params.append('name', searchParams.name);
      if (searchParams.model) params.append('model', searchParams.model);
      if (searchParams.supplier) params.append('supplier', searchParams.supplier);

      const response = await api.get(`/products/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_${dayjs().format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns = [
    {
      title: '商品ID',
      dataIndex: 'item_id',
      key: 'item_id',
      width: 100,
    },
    {
      title: '型番',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      ellipsis: true,
    },
    {
      title: '商品名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '在庫',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      render: (stock: number) => stock || 0,
    },
    {
      title: '販売価格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: number) => price ? `¥${price.toLocaleString()}` : '-',
    },
    {
      title: '仕入先',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
      render: (supplier: string) => supplier ? <Tag>{supplier}</Tag> : '-',
    },
    {
      title: '仕入先在庫',
      dataIndex: 'supplier_stock',
      key: 'supplier_stock',
      width: 100,
      render: (stock: number) => stock || 0,
    },
    {
      title: '更新日時',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>商品管理</Title>
        </Col>
        <Col>
          <Space>
            <Button 
              icon={<ClearOutlined />}
              onClick={handleClearAll}
            >
              検索条件クリア
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              CSV出力
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="商品名で検索"
              allowClear
              onSearch={(value) => handleSearch('name', value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Search
              placeholder="型番で検索"
              allowClear
              onSearch={(value) => handleSearch('model', value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Search
              placeholder="仕入先で検索"
              allowClear
              onSearch={(value) => handleSearch('supplier', value)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          dataSource={data?.data || []}
          columns={columns}
          rowKey="item_id"
          loading={isLoading}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.size,
            total: data?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / ${total}件`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default ProductsPage;
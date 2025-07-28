import React, { useState } from 'react';
import { Typography, Tabs } from 'antd';
import { SettingOutlined, ExperimentOutlined } from '@ant-design/icons';
import BasicMappingPage from './BasicMappingPage';
import AdvancedMappingPage from './AdvancedMappingPage';

const { Title } = Typography;
const { TabPane } = Tabs;

const MappingPage: React.FC = () => {
  const [selectedSupplier, setSelectedSupplier] = useState('supplier_a');

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>マッピングルール設定</Title>
      
      <Tabs defaultActiveKey="basic" type="card">
        <TabPane 
          tab={
            <span>
              <SettingOutlined />
              基本マッピング
            </span>
          } 
          key="basic"
        >
          <BasicMappingPage 
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
          />
        </TabPane>
        <TabPane 
          tab={
            <span>
              <ExperimentOutlined />
              高度なマッピング
            </span>
          } 
          key="advanced"
        >
          <AdvancedMappingPage />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default MappingPage;
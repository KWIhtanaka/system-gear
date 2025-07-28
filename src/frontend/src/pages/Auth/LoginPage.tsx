import React from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { useAuthStore } from '../../store/authStore';
import { authService, LoginRequest } from '../../services/auth';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const loginMutation = useMutation(authService.login, {
    onSuccess: (response) => {
      if (response.success && response.data) {
        login(response.data.token, response.data.user);
        message.success('ログインしました');
        navigate('/dashboard');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'ログインに失敗しました');
    }
  });

  const onFinish = (values: LoginRequest) => {
    loginMutation.mutate(values);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            System Gear EC
          </Title>
          <Title level={4} style={{ color: '#666', fontWeight: 'normal' }}>
            管理画面
          </Title>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="ユーザー名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'パスワードを入力してください' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{ width: '100%' }}
              loading={loginMutation.isLoading}
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
          デモ用: admin / admin123
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
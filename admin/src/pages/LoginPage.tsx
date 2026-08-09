import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #f7f1e8, #f0e4ec)',
      }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={3}>Petticoat Admin</Typography.Title>
        <Typography.Paragraph type="secondary">
          编辑/管理员登录。开发环境验证码任意 4 位数字；种子账号手机号{' '}
          <code>10000000000</code>（ADMIN）。
        </Typography.Paragraph>
        <Form
          layout="vertical"
          onFinish={async (v) => {
            try {
              await login(v.phone, v.code);
              message.success('登录成功');
              navigate('/');
            } catch (e) {
              message.error(e instanceof Error ? e.message : '登录失败');
            }
          }}
          initialValues={{ phone: '10000000000', code: '0000' }}>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="验证码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}

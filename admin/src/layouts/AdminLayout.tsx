import {
  AppstoreOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Layout, Menu, theme, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const { Header, Sider, Content } = Layout;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: '概览' },
    { key: '/brands', icon: <TagsOutlined />, label: '品牌' },
    { key: '/items', icon: <AppstoreOutlined />, label: '物品/变体' },
    { key: '/posts', icon: <FileTextOutlined />, label: '内容' },
    ...(user?.role === 'ADMIN'
      ? [{ key: '/users', icon: <TeamOutlined />, label: '用户' }]
      : []),
  ];

  const selected =
    items.find((i) =>
      i.key === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(i.key),
    )?.key ?? '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={64}>
        <div style={{ color: '#fff', padding: 16, fontWeight: 700 }}>
          Petticoat Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 24,
          }}>
          <Typography.Text type="secondary">
            {user?.nickname} · {user?.role}
          </Typography.Text>
          <LogoutOutlined
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{ cursor: 'pointer' }}
            title="退出"
          />
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

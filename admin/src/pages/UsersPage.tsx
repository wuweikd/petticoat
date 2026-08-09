import { Input, Select, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, type UserRow } from '../api';

const ROLES = [
  { value: 'USER', label: '普通用户' },
  { value: 'EDITOR', label: '编辑' },
  { value: 'ADMIN', label: '管理员' },
];

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setRows(await api.listUsers(q));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败（需 ADMIN）');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          用户与角色
        </Typography.Title>
        <Input.Search
          placeholder="昵称/手机号"
          allowClear
          onSearch={(v) => void load(v || undefined)}
          style={{ width: 240 }}
        />
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: '昵称', dataIndex: 'nickname' },
          { title: '手机号', dataIndex: 'phone', width: 140 },
          {
            title: '角色',
            dataIndex: 'role',
            width: 160,
            render: (role: string, row) => (
              <Select
                value={role}
                style={{ width: 130 }}
                options={ROLES}
                onChange={async (next) => {
                  try {
                    await api.updateUser(row.id, { role: next });
                    message.success('已更新角色');
                    await load();
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : '失败');
                  }
                }}
              />
            ),
          },
          {
            title: '衣橱',
            width: 80,
            render: (_, r) => r._count?.wardrobeEntries ?? 0,
          },
          {
            title: '帖子',
            width: 80,
            render: (_, r) => r._count?.posts ?? 0,
          },
        ]}
      />
    </div>
  );
}

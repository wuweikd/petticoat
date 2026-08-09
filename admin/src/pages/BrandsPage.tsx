import { Button, Form, Input, Modal, Space, Table, Typography, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, type BrandRow } from '../api';

export function BrandsPage() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ name: string }>();

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setRows(await api.listBrands(q));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
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
          品牌目录
        </Typography.Title>
        <Space>
          <Input.Search
            placeholder="搜索品牌"
            allowClear
            onSearch={(v) => void load(v || undefined)}
            style={{ width: 220 }}
          />
          <Button type="primary" onClick={() => setOpen(true)}>
            新建品牌
          </Button>
        </Space>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: '物品数',
            dataIndex: ['_count', 'items'],
            width: 120,
            render: (v: number | undefined) => v ?? 0,
          },
          { title: 'ID', dataIndex: 'id', ellipsis: true },
        ]}
      />
      <Modal
        title="新建品牌"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const { name } = await form.validateFields();
          try {
            await api.createBrand(name);
            message.success('已创建');
            setOpen(false);
            form.resetFields();
            await load();
          } catch (e) {
            message.error(e instanceof Error ? e.message : '创建失败');
          }
        }}
        destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="品牌名"
            rules={[{ required: true, message: '请输入品牌名' }]}>
            <Input placeholder="如 Angelic Pretty" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { api, type ItemRow, type PostRow } from '../api';

const TYPES = [
  { value: 'brand_release', label: '品牌上新' },
  { value: 'official', label: '官方资讯' },
  { value: 'encyclopedia', label: '风格百科' },
  { value: 'outfit', label: '穿搭分享' },
  { value: 'tutorial', label: '教程心得' },
];

const STATUSES = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'hidden', label: '隐藏' },
];

export function PostsPage() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [posts, itemList] = await Promise.all([
        api.listPosts(),
        api.listItems(),
      ]);
      setRows(posts);
      setItems(itemList);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const variantOptions = items.flatMap((item) =>
    item.variants.map((v) => ({
      value: v.id,
      label: `${item.brand.name} · ${item.name} · ${
        (
          {
            JSK: '背带裙',
            OP: '连衣裙',
            SK: '半裙',
            Blouse: '衬衫',
            Cardigan: '开衫',
            Coat: '大衣',
            Cape: '披肩',
            Headdress: '头饰',
            Hairbow: '发带',
            Wristcuff: '手袖',
            Bag: '包',
            Pannier: '裙撑',
            Shoes: '鞋',
            Socks: '袜',
            Other: '其他',
          } as Record<string, string>
        )[v.cut] ?? v.cut
      } ${v.colorName}`,
    })),
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          内容（CMS）
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          新建内容
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          {
            title: '类型',
            dataIndex: 'type',
            width: 120,
            render: (t: string) => TYPES.find((x) => x.value === t)?.label ?? t,
          },
          { title: '标题', dataIndex: 'title' },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => {
              const color =
                s === 'published' ? 'green' : s === 'hidden' ? 'default' : 'gold';
              return (
                <Tag color={color}>
                  {STATUSES.find((x) => x.value === s)?.label ?? s}
                </Tag>
              );
            },
          },
          {
            title: '上新日',
            dataIndex: 'releaseAt',
            width: 120,
            render: (v?: string | null) =>
              v ? dayjs(v).format('YYYY-MM-DD') : '—',
          },
          {
            title: '作者',
            width: 120,
            render: (_, r) => r.author?.nickname ?? '—',
          },
          {
            title: '操作',
            width: 200,
            render: (_, r) => (
              <Space>
                {r.status !== 'published' ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={async () => {
                      try {
                        await api.updatePost(r.id, { status: 'published' });
                        message.success('已发布');
                        await load();
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : '失败');
                      }
                    }}>
                    发布
                  </Button>
                ) : (
                  <Button
                    type="link"
                    size="small"
                    onClick={async () => {
                      try {
                        await api.updatePost(r.id, { status: 'hidden' });
                        message.success('已隐藏');
                        await load();
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : '失败');
                      }
                    }}>
                    隐藏
                  </Button>
                )}
                <Button
                  type="link"
                  danger
                  size="small"
                  onClick={async () => {
                    try {
                      await api.deletePost(r.id);
                      message.success('已删除');
                      await load();
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '失败');
                    }
                  }}>
                  删
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="新建内容"
        open={open}
        width={640}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const v = await form.validateFields();
          try {
            await api.createPost({
              ...v,
              releaseAt: v.releaseAt
                ? dayjs(v.releaseAt).format('YYYY-MM-DD')
                : undefined,
            });
            message.success('已创建');
            setOpen(false);
            form.resetFields();
            await load();
          } catch (e) {
            message.error(e instanceof Error ? e.message : '失败');
          }
        }}
        destroyOnHidden>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'brand_release', status: 'draft' }}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={TYPES} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="body" label="正文">
            <Input.TextArea rows={4} />
          </Form.Item>
          {type === 'brand_release' ? (
            <Form.Item
              name="releaseAt"
              label="上新日期"
              rules={[{ required: true, message: '品牌上新必填日期' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          ) : null}
          <Form.Item name="variantIds" label="关联变体">
            <Select
              mode="multiple"
              options={variantOptions}
              optionFilterProp="label"
              placeholder={
                type === 'outfit' ? '穿搭至少选 1 个' : '可选（教程/上新）'
              }
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={STATUSES} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

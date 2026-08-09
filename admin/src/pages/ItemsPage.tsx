import {
  Button,
  Descriptions,
  Drawer,
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
import { useCallback, useEffect, useState } from 'react';
import { api, type BrandRow, type ItemDetail, type ItemRow } from '../api';

const CATEGORIES = [
  { value: 'skirt', label: '裙子' },
  { value: 'top', label: '上装' },
  { value: 'outer', label: '外套' },
  { value: 'accessory', label: '配件' },
  { value: 'foundation', label: '底层' },
  { value: 'footwear', label: '鞋袜' },
];

const CUTS: Record<string, string[]> = {
  skirt: ['JSK', 'OP', 'SK'],
  top: ['Blouse', 'Cardigan'],
  outer: ['Coat', 'Cape'],
  accessory: ['Headdress', 'Hairbow', 'Wristcuff', 'Bag'],
  foundation: ['Pannier'],
  footwear: ['Shoes', 'Socks'],
};

const CUT_LABEL: Record<string, string> = {
  JSK: '背带裙（JSK）',
  OP: '连衣裙（OP）',
  SK: '半裙（SK）',
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
};

const COLOR_OPTIONS = [
  { value: 'black', label: '黑' },
  { value: 'white', label: '白' },
  { value: 'red', label: '红' },
  { value: 'pink', label: '粉' },
  { value: 'blue', label: '蓝' },
  { value: 'green', label: '绿' },
  { value: 'purple', label: '紫' },
  { value: 'brown', label: '棕' },
  { value: 'yellow', label: '黄' },
  { value: 'multicolor', label: '多色' },
  { value: 'other', label: '其他' },
];

export function ItemsPage() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [variantOpen, setVariantOpen] = useState(false);
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();
  const category = Form.useWatch('category', form);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [items, brandList] = await Promise.all([
        api.listItems(q),
        api.listBrands(),
      ]);
      setRows(items);
      setBrands(brandList);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    try {
      setDetail(await api.getItem(id));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载详情失败');
    }
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          物品 / 变体
        </Typography.Title>
        <Space>
          <Input.Search
            placeholder="搜索裙名/品牌"
            allowClear
            onSearch={(v) => void load(v || undefined)}
            style={{ width: 240 }}
          />
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            新建物品+首个变体
          </Button>
        </Space>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: '品牌', dataIndex: ['brand', 'name'], width: 160 },
          { title: '名称', dataIndex: 'name' },
          {
            title: '品类',
            dataIndex: 'category',
            width: 100,
            render: (c: string) =>
              CATEGORIES.find((x) => x.value === c)?.label ?? c,
          },
          {
            title: '变体数',
            width: 90,
            render: (_, r) => r.variants?.length ?? r._count?.variants ?? 0,
          },
          {
            title: '操作',
            width: 100,
            render: (_, r) => (
              <Button type="link" onClick={() => void openDetail(r.id)}>
                详情
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title="新建物品"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const v = await form.validateFields();
          try {
            await api.createItem(v);
            message.success('已创建');
            setCreateOpen(false);
            form.resetFields();
            await load();
          } catch (e) {
            message.error(e instanceof Error ? e.message : '创建失败');
          }
        }}
        destroyOnHidden
        width={520}>
        <Form form={form} layout="vertical" initialValues={{ category: 'skirt', cut: 'JSK', baseColor: 'black' }}>
          <Form.Item name="brandId" label="品牌" rules={[{ required: true }]}>
            <Select
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="name" label="物品名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="品类" rules={[{ required: true }]}>
            <Select
              options={CATEGORIES}
              onChange={() => form.setFieldValue('cut', CUTS[form.getFieldValue('category')]?.[0])}
            />
          </Form.Item>
          <Form.Item name="colorName" label="色名" rules={[{ required: true }]}>
            <Input placeholder="如 Mimosa / Black" />
          </Form.Item>
          <Form.Item name="baseColor" label="基色" rules={[{ required: true }]}>
            <Select options={COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="cut" label="裁式" rules={[{ required: true }]}>
            <Select
              options={(CUTS[category] ?? []).map((c) => ({
                value: c,
                label: CUT_LABEL[c] ?? c,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        width={720}
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.brand.name} · ${detail.name}` : ''}
        extra={
          <Button
            type="primary"
            onClick={() => {
              variantForm.resetFields();
              setVariantOpen(true);
            }}>
            添加变体
          </Button>
        }>
        {detail ? (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="品类">
                {CATEGORIES.find((c) => c.value === detail.category)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                {detail.createdBy?.nickname ?? detail.createdByUserId}
              </Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id"
              pagination={false}
              dataSource={detail.variants}
              columns={[
                { title: '色名', dataIndex: 'colorName' },
                {
                  title: '基色',
                  dataIndex: 'baseColor',
                  width: 100,
                  render: (c: string) =>
                    COLOR_OPTIONS.find((o) => o.value === c)?.label ?? c,
                },
                {
                  title: '裁式',
                  dataIndex: 'cut',
                  width: 120,
                  render: (c: string) => CUT_LABEL[c] ?? c,
                },
                {
                  title: '同款',
                  width: 90,
                  render: (_, v) => v.linkedUserCount ?? v.wardrobeLinkCount ?? 0,
                },
                {
                  title: '锁定',
                  width: 80,
                  render: (_, v) =>
                    v.lockedForCreator ? <Tag color="red">锁定</Tag> : <Tag>可改</Tag>,
                },
                {
                  title: '操作',
                  width: 140,
                  render: (_, v) => (
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        onClick={async () => {
                          const colorName = window.prompt('新色名', v.colorName);
                          if (!colorName) return;
                          try {
                            await api.updateVariant(v.id, { colorName });
                            message.success('已更新');
                            await openDetail(detail.id);
                          } catch (e) {
                            message.error(e instanceof Error ? e.message : '失败');
                          }
                        }}>
                        改色名
                      </Button>
                      <Button
                        type="link"
                        danger
                        size="small"
                        onClick={async () => {
                          try {
                            await api.deleteVariant(v.id);
                            message.success('已删除');
                            await openDetail(detail.id);
                            await load();
                          } catch (e) {
                            message.error(e instanceof Error ? e.message : '删除失败');
                          }
                        }}>
                        删
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </Drawer>

      <Modal
        title="添加变体"
        open={variantOpen}
        onCancel={() => setVariantOpen(false)}
        onOk={async () => {
          if (!detail) return;
          const v = await variantForm.validateFields();
          try {
            await api.createVariant(detail.id, v);
            message.success('已添加');
            setVariantOpen(false);
            await openDetail(detail.id);
            await load();
          } catch (e) {
            message.error(e instanceof Error ? e.message : '失败');
          }
        }}
        destroyOnHidden>
        <Form
          form={variantForm}
          layout="vertical"
          initialValues={{
            cut: CUTS[detail?.category ?? 'skirt']?.[0],
            baseColor: 'black',
          }}>
          <Form.Item name="colorName" label="色名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="baseColor" label="基色" rules={[{ required: true }]}>
            <Select options={COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="cut" label="裁式" rules={[{ required: true }]}>
            <Select
              options={(CUTS[detail?.category ?? 'skirt'] ?? []).map((c) => ({
                value: c,
                label: CUT_LABEL[c] ?? c,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

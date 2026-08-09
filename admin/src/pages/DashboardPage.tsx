import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { api, type Health } from '../api';

export function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        概览
      </Typography.Title>
      {error ? (
        <Alert
          type="warning"
          showIcon
          message="无法连接 API"
          description={`${error}。请先启动 server（默认 http://localhost:3001）。`}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="API" value={health?.ok ? '正常' : '未知'} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="数据库"
              value={
                health?.database === 'up'
                  ? '已连接'
                  : health
                    ? '未连接'
                    : '检测中'
              }
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="下一步" value="目录 / 用户 / 内容" />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

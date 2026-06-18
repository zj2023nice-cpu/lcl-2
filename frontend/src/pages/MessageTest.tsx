import { useState } from 'react';
import { useMessage } from '@/hooks/useMessage';
import Button from '@/components/UI/Button';
import Card from '@/components/UI/Card';

export default function MessageTest() {
  const message = useMessage();
  const [customContent, setCustomContent] = useState('这是一条测试消息');
  const [customDuration, setCustomDuration] = useState(3000);

  const handleSuccess = () => {
    message.success(customContent || '操作成功！');
  };

  const handleError = () => {
    message.error(customContent || '操作失败，请重试！');
  };

  const handleWarning = () => {
    message.warning(customContent || '请注意，这是一个警告！');
  };

  const handleLoading = () => {
    const id = message.loading(customContent || '正在加载中...', customDuration);
    if (customDuration > 0) {
      setTimeout(() => {
        message.remove(id);
        message.success('加载完成！');
      }, 2000);
    }
  };

  const handleMultipleSuccess = () => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        message.success(`成功消息 ${i + 1}`);
      }, i * 200);
    }
  };

  const handleMixedMessages = () => {
    const types = ['success', 'error', 'warning', 'success', 'error', 'success', 'warning'] as const;
    types.forEach((type, i) => {
      setTimeout(() => {
        message[type](`${type} 消息 ${i + 1}`);
      }, i * 200);
    });
  };

  const handleClearAll = () => {
    message.clearAll();
  };

  return (
    <div className="min-h-screen bg-rock-dark-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-rock-light-100 mb-2">全局消息提示系统测试</h1>
        <p className="text-rock-light-400 mb-8">
          测试消息提示的各种功能：成功、失败、警告、加载中，以及消息合并逻辑。
        </p>

        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-rock-light-100 mb-4">基础消息类型</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSuccess}>成功消息</Button>
            <Button variant="danger" onClick={handleError}>错误消息</Button>
            <Button variant="secondary" onClick={handleWarning}>警告消息</Button>
            <Button variant="outline" onClick={handleLoading}>加载中消息</Button>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-rock-light-100 mb-4">自定义配置</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-rock-light-300 mb-2">
                消息内容
              </label>
              <input
                type="text"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="w-full px-4 py-2 bg-rock-dark-800 border border-rock-dark-700 rounded-lg text-rock-light-100 focus:outline-none focus:ring-2 focus:ring-climbing-orange-500"
                placeholder="输入自定义消息内容"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rock-light-300 mb-2">
                自动关闭时间 (毫秒)
              </label>
              <input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full px-4 py-2 bg-rock-dark-800 border border-rock-dark-700 rounded-lg text-rock-light-100 focus:outline-none focus:ring-2 focus:ring-climbing-orange-500"
                min="0"
                step="500"
              />
              <p className="text-xs text-rock-light-500 mt-1">设置为 0 表示不自动关闭</p>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-rock-light-100 mb-4">消息合并测试</h2>
          <p className="text-rock-light-400 text-sm mb-4">
            当消息数量超过 5 条时，最早的同类型消息会被合并。合并的消息会显示计数徽章。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleMultipleSuccess}>连发 6 条成功消息</Button>
            <Button variant="secondary" onClick={handleMixedMessages}>连发混合类型消息</Button>
            <Button variant="danger" onClick={handleClearAll}>清空所有消息</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-rock-light-100 mb-4">功能说明</h2>
          <ul className="space-y-2 text-rock-light-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>四种消息类型：成功（绿色）、错误（红色）、警告（黄色）、加载中（蓝色）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>消息从顶部滑入，带有平滑动画效果</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>支持手动点击关闭按钮关闭消息</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>支持自动消失，默认时间：成功 3s、错误 4s、警告 3.5s、加载中 不自动关闭</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>多条消息堆叠展示，最新消息在下方</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>最多显示 5 条消息，超过时自动合并最早的同类型消息</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>合并的消息显示计数徽章，重置自动关闭时间</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

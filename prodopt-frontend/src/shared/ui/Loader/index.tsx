import { Spin } from 'antd';

export const Loader = () => {
  return (
    <div className="flex justify-center items-center h-full w-full min-h-[200px]" data-testid="loader">
      <Spin size="large" />
    </div>
  );
};
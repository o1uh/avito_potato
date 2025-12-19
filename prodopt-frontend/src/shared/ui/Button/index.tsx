import { Button as AntButton, ButtonProps } from 'antd';

interface Props extends ButtonProps {
  // Можно расширять своими пропсами
}

export const Button = (props: Props) => {
  return <AntButton {...props} />;
};
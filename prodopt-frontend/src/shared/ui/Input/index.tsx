import { Input as AntInput, InputProps } from 'antd';

// Создаем основной компонент
const InternalInput = (props: InputProps) => {
  return <AntInput {...props} />;
};

// Определяем тип, который включает сам компонент и его под-компоненты
type InputType = typeof InternalInput & {
  Password: typeof AntInput.Password;
  TextArea: typeof AntInput.TextArea;
  Search: typeof AntInput.Search;
};

// Приводим тип и присваиваем статические свойства от AntD
export const Input = InternalInput as InputType;
Input.Password = AntInput.Password;
Input.TextArea = AntInput.TextArea;
Input.Search = AntInput.Search;
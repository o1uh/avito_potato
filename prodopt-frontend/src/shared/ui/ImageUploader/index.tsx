import { useState } from 'react';
import { Upload, Modal, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { RcFile } from 'antd/es/upload';

const { Dragger } = Upload;

interface Props {
  onUpload: (file: File) => Promise<any>; // Функция загрузки на сервер
  maxCount?: number;
}

export const ImageUploader = ({ onUpload, maxCount = 5 }: Props) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Обработка предпросмотра
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as RcFile);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  // Кастомная загрузка файла
  const customRequest: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      await onUpload(file as File);
      if (onSuccess) onSuccess("ok");
      message.success(`${(file as File).name} загружен успешно`);
    } catch (err) {
      if (onError) onError(err as Error);
      message.error(`${(file as File).name} ошибка загрузки`);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Dragger
          customRequest={customRequest}
          listType="picture-card"
          fileList={fileList}
          onPreview={handlePreview}
          onChange={handleChange}
          accept="image/*"
          maxCount={maxCount}
          multiple={true}
          // Скрываем зону drag-n-drop, если достигнут лимит, показываем только карточки
          showUploadList={{ showPreviewIcon: true, showRemoveIcon: false }} // Удаление пока не реализуем в UI для простоты
        >
          {fileList.length >= maxCount ? null : (
            <>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите фото сюда</p>
              <p className="ant-upload-hint">Поддерживается JPG, PNG</p>
            </>
          )}
        </Dragger>
      </div>

      <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={() => setPreviewOpen(false)}>
        <img alt="example" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </>
  );
};

// Утилита для превью
const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
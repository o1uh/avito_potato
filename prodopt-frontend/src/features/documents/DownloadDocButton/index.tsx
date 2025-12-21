import { useState } from 'react';
import { Button, message } from 'antd';
import { FilePdfOutlined, LoadingOutlined, DownloadOutlined } from '@ant-design/icons';
import { $api } from '@/shared/api/base';

interface Props {
  documentId: number;
  fileName: string;
  label?: string;
  disabled?: boolean;
}

export const DownloadDocButton = ({ documentId, fileName, label, disabled }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      
      // Запрашиваем файл как Blob. 
      // Axios автоматически пройдет по редиректу (302) от бэкенда к S3/MinIO.
      // Важно: так как домен/порт могут отличаться, Axios может сбросить Authorization заголовок при редиректе,
      // что хорошо, так как Presigned URL не требует (и не любит) лишних заголовков.
      const response = await $api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      // Создаем ссылку на Blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Создаем временный элемент ссылки для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName); // Указываем имя файла
      document.body.appendChild(link);
      link.click();
      
      // Чистим за собой
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      message.error('Не удалось скачать файл');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      icon={isLoading ? <LoadingOutlined /> : <FilePdfOutlined />} 
      onClick={handleDownload}
      disabled={disabled || isLoading}
      loading={isLoading}
    >
      {label || 'Скачать'} 
      {!label && <DownloadOutlined className="ml-1 text-xs opacity-50" />}
    </Button>
  );
};
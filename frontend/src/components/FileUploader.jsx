import React, { useCallback, useState } from 'react';
import axios from 'axios';
import { Upload, X, FileText, Check, Loader2, FolderPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 动态判断 API 基础路径，适配本地开发和 Vercel 部署
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000';

const FileUploader = ({ files, onFilesChange, onStartProcess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async (selectedFiles) => {
    const fileList = Array.from(selectedFiles);
    if (fileList.length === 0) return;
    
    // 过滤非 PDF 文件
    const pdfFiles = fileList.filter(file => file.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('请上传 PDF 格式的文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    for (let file of pdfFiles) {
      // 这里的 file.webkitRelativePath 在文件夹上传时会包含路径
      // 我们将其包装成一个新的 File 对象，只保留文件名，确保后端能正确识别
      const fileName = file.name; 
      formData.append('files', file, fileName);
    }

    try {
      console.log(`Starting upload of ${pdfFiles.length} files...`);
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${progress}%`);
          setUploadProgress(progress);
        },
      });
      console.log('Upload response:', res.data);
      onFilesChange();
    } catch (err) {
      console.error('Upload error details:', err);
      if (err.response) {
        console.error('Server responded with:', err.response.status, err.response.data);
        alert(`上传失败: 服务器返回 ${err.response.status} - ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        console.error('No response received from server');
        alert('上传失败: 无法连接到服务器，请检查后端是否启动');
      } else {
        alert(`上传失败: ${err.message}`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  const deleteAllFiles = async () => {
    if (!window.confirm('确定要删除所有已上传的文件吗？')) return;
    try {
      await axios.delete(`${API_BASE}/files`);
      onFilesChange();
    } catch (err) {
      alert('清空失败');
    }
  };

  const removeFile = async (name, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/files/${name}`);
      onFilesChange();
    } catch (err) {
      alert('删除失败');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openPdf = (name) => {
    window.open(`${API_BASE}/uploads/${name}`, '_blank');
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold">PDF 商品文件管理</h2>
          <p className="text-sm text-gray-500">上传包含商品信息的 PDF 文件进行多模态分析</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={deleteAllFiles}
            disabled={files.length === 0 || uploading}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
              files.length > 0 && !uploading
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>一键清空</span>
          </button>
          <button
            onClick={onStartProcess}
            disabled={files.length === 0 || uploading}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
              files.length > 0 && !uploading
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>开始处理 ({files.length})</span>
          </button>
        </div>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center space-y-4 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/50' 
            : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
        }`}
      >
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
          <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} />
        </div>
        <div className="text-center">
          <p className="font-medium text-gray-700">拖拽 PDF 文件或文件夹到此处</p>
          <p className="text-sm text-gray-400 mt-1">支持批量上传，单个文件最大 50MB</p>
        </div>
        <div className="flex space-x-3">
          <label className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors">
            选择文件
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              className="hidden" 
              onChange={(e) => handleUpload(e.target.files)} 
            />
          </label>
          <label className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors">
            选择文件夹
            <input 
              type="file" 
              webkitdirectory="true" 
              className="hidden" 
              onChange={(e) => handleUpload(e.target.files)} 
            />
          </label>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4 z-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="w-64 bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="bg-blue-600 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm font-medium text-blue-600">正在上传... {uploadProgress}%</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 flex items-center space-x-2">
            <span>已上传列表</span>
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">{files.length}</span>
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {Array.isArray(files) && files.map((file, idx) => (
              <motion.div
                key={file.name || idx}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => openPdf(file.name)}
                className="group bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between hover:border-blue-200 hover:bg-white transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => removeFile(file.name, e)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {files.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 text-sm italic">暂无已上传的文件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, BarChart2, Play, Download, Trash2, CheckCircle, AlertCircle, RefreshCw, ChevronRight, ChevronDown, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUploader from './components/FileUploader';
import ProcessPanel from './components/ProcessPanel';
import ResultCard from './components/ResultCard';
import ComparisonView from './components/ComparisonView';
import ReportDashboard from './components/ReportDashboard';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [files, setFiles] = useState([]);
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [selectedModels, setSelectedModels] = useState(['qwen3.5-plus', 'kimi-k2.5']);
  const [prompt, setPrompt] = useState('');

  // Fetch initial prompt from local prompt.md
  useEffect(() => {
    const defaultPrompt = `# 综合性电商商品标签多模态识别与推理任务 Prompt

## 角色定义
你是一名具备资深电商知识的“金牌导购专家”与“市场分析师”。

## 标签生成规范

### 第一类：客观标签
- 格式：KV对，\`属性:属性值\`。
- 示例：\`机身材质:航空级铝材\`、\`防水指数:10000mmH₂O\`。

### 第二类：主观标签
- 风格：口语化、场景化、强代入感。
- 示例：\`静奢户外\`、\`超模工歇风\`、\`氛围感\`。

### 第三类：短标题标签
- 要求：保留核心信息，结构精炼，提升点击欲。
- 字数限制：≤ 15字符。

**输出要求**:
请严格按照以下格式输出，禁止使用任何 Markdown 代码块（如 \`\`\`）：
**客观标签**:
- 属性名1:属性值1
- 属性名2:属性值2
**主观标签**:
- 风格标签1
- 风格标签2
**短标题标签**:
- 最终生成的短标题

**重要准则**: 
1. 客观标签必须包含冒号(:)，属性名和值都不能缺失。
2. 每一行必须以单个短横线(-)开头。
3. 不要输出任何解释性文字、模型名称或前言。
4. 确保输出完整，不要中途截断。`;
    setPrompt(defaultPrompt);
  }, []);

  const refreshFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/files`);
      // 确保 res.data 是数组，增加安全性
      setFiles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch files', err);
      setFiles([]); // 出错时重置为空数组，防止 .map 报错
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  const handleStartProcess = async () => {
    if (files.length === 0) return alert('请先上传文件');
    try {
      setTaskStatus({ status: 'pending', progress: 0 }); // Reset status
      const res = await axios.post(`${API_BASE}/process`, {
        files: files.map(f => f.name),
        models: selectedModels,
        prompt: prompt
      });
      setTaskId(res.data.task_id);
      setActiveTab('process');
    } catch (err) {
      alert('启动处理失败');
    }
  };

  // Poll for task status
  useEffect(() => {
    let interval;
    if (taskId && (taskStatus?.status !== 'completed' && taskStatus?.status !== 'failed')) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/tasks/${taskId}`);
          setTaskStatus(res.data);
          if (res.data.status === 'completed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Failed to poll task', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, taskStatus]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans w-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full shadow-sm">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('upload')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <BarChart2 className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-gray-800">AI 多模态商品标签平台</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Intelligence Engine v1.0</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex space-x-1 bg-gray-100/80 p-1.5 rounded-2xl backdrop-blur-md">
            {[
              { id: 'upload', label: '文件上传', icon: Upload },
              { id: 'process', label: '模型推理', icon: Play },
              { id: 'results', label: '结果对比', icon: FileText },
              { id: 'report', label: '评测报告', icon: BarChart2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
             <button className="flex items-center space-x-2 p-1 pr-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 transition-all group">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md group-hover:scale-105 transition-transform">
                 YX
               </div>
               <div className="hidden sm:block text-left">
                 <p className="text-xs font-bold text-gray-700">Yancheng</p>
                 <p className="text-[9px] text-gray-400 font-medium">Administrator</p>
               </div>
               <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-8 mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <FileUploader 
                files={files} 
                onFilesChange={refreshFiles} 
                onStartProcess={handleStartProcess}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <ProcessPanel 
                    selectedModels={selectedModels} 
                    setSelectedModels={setSelectedModels}
                    prompt={prompt}
                    setPrompt={setPrompt}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'process' && (
            <motion.div
              key="process"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
                {!taskId ? (
                  <div className="py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">未开始处理</h2>
                    <p className="text-gray-500 mb-6">请在上传页面选择文件并点击“开始处理”</p>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700"
                    >
                      前往上传
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-left">
                        <h2 className="text-2xl font-bold">正在处理任务...</h2>
                        <p className="text-gray-500">正在调用 {selectedModels.length} 个大模型进行并行推理</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold text-blue-600">{taskStatus?.progress || 0}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-8 overflow-hidden">
                      <motion.div 
                        className="bg-blue-600 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${taskStatus?.progress || 0}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">当前处理商品</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="font-medium truncate">{taskStatus?.current_file || '准备中...'}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">当前活跃模型</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium">{taskStatus?.current_model || '等待中...'}</span>
                        </div>
                      </div>
                    </div>

                    {taskStatus?.status === 'completed' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-50 border border-green-100 p-6 rounded-2xl flex flex-col items-center"
                      >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-green-800">推理任务已完成！</h3>
                        <p className="text-green-600 mb-4">所有商品已处理完毕，可以查看对比分析和评测报告。</p>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => setActiveTab('results')}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700"
                          >
                            查看对比结果
                          </button>
                          <button 
                            onClick={() => setActiveTab('report')}
                            className="bg-white border border-green-200 text-green-700 px-6 py-2 rounded-xl font-medium hover:bg-green-50"
                          >
                            查看评测报告
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {taskStatus?.results ? (
                <ComparisonView 
                  results={taskStatus.results} 
                  models={selectedModels} 
                  taskId={taskId}
                />
              ) : (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无结果，请先完成推理任务</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {taskStatus?.final_report || taskStatus?.status === 'completed' ? (
                <ReportDashboard 
                  report={taskStatus?.final_report || "正在生成最终评估报告，请稍候..."} 
                  results={taskStatus?.results} 
                />
              ) : (
                <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
                  <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无评测报告，请先完成推理任务</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;

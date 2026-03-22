import React, { useState } from 'react';
import { Settings, Check, ChevronDown, MessageSquare, Monitor, Bot, AlertCircle, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProcessPanel = ({ selectedModels, setSelectedModels, prompt, setPrompt }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
请严格按照以下格式输出：
**客观标签**:
- 属性1:值1
- 属性2:值2
**主观标签**:
- 标签1
- 标签2
**短标题标签**:
- 短标题内容`;

  const handleRestoreDefault = () => {
    if (window.confirm('确定要恢复默认 Prompt 指令吗？所有修改都将丢失。')) {
      setPrompt(defaultPrompt);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  const models = [
    { id: 'qwen3.5-plus', name: 'Qwen 3.5 Plus', description: '通义千问最新旗舰模型，逻辑推理能力强' },
    { id: 'kimi-k2.5', name: 'Kimi K2.5', description: 'Moonshot 最新超长上下文模型，语言理解精准' },
  ];

  const toggleModel = (id) => {
    if (selectedModels.includes(id)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(m => m !== id));
      }
    } else {
      setSelectedModels([...selectedModels, id]);
    }
  };

  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-[100] h-auto shadow-2xl ring-4 ring-blue-500/20' : 'h-full'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none mb-1">推理引擎配置</h2>
            <p className="text-xs text-gray-400">选择要对比的模型并自定义推理指令</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-xl transition-all ${showInfo ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <AlertCircle className="w-5 h-5" />
          </button>
          {isFullscreen && (
            <button 
              onClick={toggleFullscreen}
              className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
            >
              退出全屏
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInfo && !isFullscreen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>快速说明</span>
              </h3>
              <ul className="text-xs text-blue-700 space-y-2">
                <li>• 支持 PDF 批量上传与文件夹拖拽，自动提取视觉核心。</li>
                <li>• 集成多模型并行推理，实时反馈每个模型的生成进度。</li>
                <li>• 智能解析模型输出，提取客观属性、主观风格及营销短标题。</li>
                <li>• 生成综合评测报告，对比各模型在准确度与创意度上的差异。</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`space-y-6 flex-1 overflow-hidden flex flex-col ${isFullscreen ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {!isFullscreen && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
              <Bot className="w-4 h-4 text-purple-500" />
              <span>多模型对比选择</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {models.map((model) => (
                <motion.button
                  key={model.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleModel(model.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedModels.includes(model.id)
                      ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-200'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold ${selectedModels.includes(model.id) ? 'text-purple-700' : 'text-gray-700'}`}>
                      {model.name}
                    </span>
                    {selectedModels.includes(model.id) && (
                      <div className="bg-purple-600 text-white rounded-full p-0.5 shadow-sm shadow-purple-200">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{model.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span>核心推理 Prompt 指令</span>
          </h3>
          <div className="relative flex-1 group min-h-0">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-mono text-gray-600 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none resize-none overflow-y-auto"
              placeholder="请输入系统级 Prompt 指令..."
            />
            <div className="absolute top-2 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={handleRestoreDefault}
                 className="bg-white/90 backdrop-blur px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-200 hover:bg-white hover:text-red-600 transition-all shadow-sm active:scale-95"
               >
                 恢复默认
               </button>
               <button 
                 onClick={toggleFullscreen}
                 className="bg-white/90 backdrop-blur px-2 py-1.5 rounded-lg text-[10px] font-bold text-gray-500 border border-gray-200 hover:bg-white hover:text-purple-600 transition-all shadow-sm active:scale-95"
               >
                 {isFullscreen ? '退出全屏' : '全屏编辑'}
               </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-gray-400 flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>提示：Prompt 指令将作为多模态推理的全局上下文，控制标签生成的风格和规范。</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessPanel;

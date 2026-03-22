import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Search, Filter, Layers, Zap, Info, MoreVertical, Copy, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ResultCard = ({ title, category, results, models }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedModel, setCopiedModel] = useState(null);

  const handleSearch = () => {
    const query = encodeURIComponent(`${title} ${category}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  const handleCopy = (modelId, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedModel(modelId);
      setTimeout(() => setCopiedModel(null), 2000);
    });
  };

  const parseModelResult = (text) => {
    const sections = {
      objective: [],
      subjective: [],
      short_title: []
    };
    
    // 鲁棒的解析逻辑
    const cleanText = text
      .replace(/```[a-z]*\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\*\*/g, '') // 移除加粗
      .trim();
    
    const lines = cleanText.split('\n');
    let currentSection = '';

    lines.forEach(line => {
      const cleanLine = line.replace(/^[*-]\s*/, '').trim();
      if (!cleanLine) return;

      if (cleanLine.includes('客观标签')) {
        currentSection = 'objective';
      } else if (cleanLine.includes('主观标签')) {
        currentSection = 'subjective';
      } else if (cleanLine.includes('短标题')) {
        currentSection = 'short_title';
      } else if (currentSection === 'objective' && cleanLine.includes(':')) {
        // 确保客观标签是 key:value 格式
        sections.objective.push(cleanLine);
      } else if (currentSection === 'subjective' && cleanLine.length > 0) {
        sections.subjective.push(cleanLine);
      } else if (currentSection === 'short_title' && cleanLine.length > 0) {
        sections.short_title.push(cleanLine);
      }
    });

    return sections;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="px-8 py-5 flex items-center justify-between border-b border-gray-100 group">
        <div className="flex items-center space-x-5">
           <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
             <FileText className="w-6 h-6" />
           </div>
           <div>
             <h4 className="text-xl font-black text-gray-800 tracking-tight mb-1">{title}</h4>
             <div className="flex items-center space-x-3">
               <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{category}</span>
               <div className="w-1 h-1 bg-gray-300 rounded-full" />
               <span className="text-gray-400 text-xs font-bold">PDF 商品图文全息识别结果</span>
             </div>
           </div>
        </div>
        
        <div className="flex items-center space-x-2">
           <button 
             onClick={handleSearch}
             className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all active:scale-90"
             title="搜索此商品"
           >
             <Search className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className="p-3 bg-gray-50 text-gray-400 hover:text-gray-800 rounded-xl transition-all active:scale-90"
           >
             {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {models.map((modelId) => {
                  const data = parseModelResult(results[modelId] || '');
                  return (
                    <div key={modelId} className="space-y-4 border border-gray-100 p-5 rounded-2xl bg-gray-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                           <div className={`w-2 h-2 rounded-full ${modelId === 'qwen3.5-plus' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                           <span className="text-xs font-bold text-gray-700 uppercase">{modelId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleCopy(modelId, results[modelId])}
                            className={`p-2 transition-all active:scale-90 rounded-lg ${copiedModel === modelId ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                          >
                            {copiedModel === modelId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-all active:scale-90">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* 客观标签 */}
                        <div>
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-1">
                            <Layers className="w-3 h-3" />
                            <span>客观标签</span>
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {data.objective.map((tag, idx) => {
                              const parts = tag.split(':');
                              const key = parts[0];
                              const value = parts.slice(1).join(':'); // 兼容值里也包含冒号的情况
                              return (
                                <div key={idx} className="flex items-center bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                  <span className="px-2 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 border-r border-gray-100 uppercase">{key}</span>
                                  <span className="px-3 py-1 text-xs font-medium text-gray-700">{value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 主观标签 */}
                        <div>
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>主观标签</span>
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {data.subjective.map((tag, idx) => (
                              <span key={idx} className="bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-lg text-xs font-bold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 短标题标签 */}
                        <div>
                          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-1">
                            <Info className="w-3 h-3 text-blue-500" />
                            <span>短标题</span>
                          </h4>
                          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
                            {data.short_title.map((tag, idx) => (
                              <p key={idx} className="text-sm font-bold text-blue-800 italic">“{tag}”</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultCard;

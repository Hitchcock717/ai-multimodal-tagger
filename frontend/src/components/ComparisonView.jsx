import React, { useState } from 'react';
import { Search, Filter, Layers, Zap, Info, MoreVertical, Download, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ResultCard from './ResultCard';

const ComparisonView = ({ results, models, taskId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isExporting, setIsExporting] = useState(false);

  const categories = ['All', ...Object.keys(results)];

  const handleExport = async (format = 'xlsx') => {
    if (!taskId) return alert('任务 ID 缺失，无法导出');
    setIsExporting(true);
    try {
      // 使用 a 标签模拟下载，更稳定
      const link = document.createElement('a');
      link.href = `http://localhost:8000/download/${taskId}?format=${format}`;
      link.setAttribute('download', `全量结果_${taskId}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed', err);
      alert('导出失败');
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const filteredResults = [];
  Object.entries(results).forEach(([category, products]) => {
    if (selectedCategory !== 'All' && category !== selectedCategory) return;
    
    Object.entries(products).forEach(([title, res]) => {
      if (searchTerm && !title.toLowerCase().includes(searchTerm.toLowerCase())) return;
      filteredResults.push({ category, title, results: res });
    });
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white/80 p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-10 backdrop-blur-md">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="搜索商品名称..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none shadow-inner"
          />
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-12 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium appearance-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none cursor-pointer"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat === 'All' ? '全部品类' : cat}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className={`flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '导出中...' : '导出全量 Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="space-y-6">
        {filteredResults.map((item, idx) => (
          <ResultCard 
            key={idx}
            title={item.title}
            category={item.category}
            results={item.results}
            models={models}
          />
        ))}

        {filteredResults.length === 0 && (
          <div className="bg-white p-24 rounded-2xl border border-gray-200 shadow-sm text-center">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search className="w-10 h-10 text-gray-200" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 mb-2">未找到匹配商品</h3>
             <p className="text-gray-500">尝试调整搜索词或品类筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonView;

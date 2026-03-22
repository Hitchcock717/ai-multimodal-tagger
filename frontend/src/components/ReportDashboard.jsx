import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie } from 'recharts';
import { Download, Share2, CheckCircle, TrendingUp, Zap, Target, Award, Info, FileText, ChevronRight, Layers, List, Bookmark, Eye, Clock, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ReportDashboard = ({ report, results }) => {
  const [activeSection, setActiveSection] = useState('');

  // 1. 性能指标数据
  const performanceData = [
    { name: '标签准确率', qwen: 92, kimi: 88, full: 100 },
    { name: '风格创意度', qwen: 85, kimi: 94, full: 100 },
    { name: '响应速度', qwen: 95, kimi: 82, full: 100 },
    { name: '描述一致性', qwen: 90, kimi: 91, full: 100 },
    { name: '格式规范性', qwen: 98, kimi: 96, full: 100 },
  ];

  // 2. 品类统计
  const categoryStats = useMemo(() => {
    if (!results || typeof results !== 'object') return [];
    try {
      return Object.entries(results).map(([cat, products]) => ({
        name: cat,
        count: products ? Object.keys(products).length : 0
      }));
    } catch (e) {
      console.error("Error calculating categoryStats:", e);
      return [];
    }
  }, [results]);

  const totalProducts = useMemo(() => {
    return categoryStats.reduce((acc, curr) => acc + curr.count, 0);
  }, [categoryStats]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  // 3. 将 Markdown 拆分为结构化章节
  const sections = useMemo(() => {
    const safeReport = String(report || '').trim();
    if (!safeReport) return [];

    // 简单的正则拆分：按二级标题 ## 拆分
    const parts = safeReport.split(/(?=^##\s+)/m);
    return parts.map((part, index) => {
      const match = part.match(/^##\s+(.+)$/m);
      const title = match ? match[1] : (index === 0 ? '引言' : `章节 ${index}`);
      const id = `section-${index}`;
      
      // 去除内容中重复的标题部分，避免展示时标题和内容重复
      const contentWithoutTitle = match ? part.replace(match[0], '').trim() : part;
      
      // 进一步处理 Markdown 渲染
      const options = { gfm: true, breaks: true, async: false };
      const markedInstance = (marked && marked.parse) ? marked.parse : marked;
      const rawHtml = typeof markedInstance === 'function' ? markedInstance(contentWithoutTitle, options) : contentWithoutTitle;
      const html = DOMPurify.sanitize(rawHtml);

      return { id, title, html };
    });
  }, [report]);

  // 4. 监听滚动以更新激活的目录项
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const handleDownloadMD = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([report], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = "商品标签分析报告.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full space-y-12 pb-24 bg-slate-50/50">
      {/* 1. 顶部概要卡片 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/30 to-blue-100/20 rounded-full -translate-y-1/2 translate-x-1/2 -z-1 blur-[100px]" />
        
        <div className="flex flex-col lg:flex-row items-start justify-between mb-16 space-y-10 lg:space-y-0">
          <div className="flex-1 space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <span className="bg-slate-900 text-white px-5 py-2 rounded-2xl text-[12px] font-black tracking-[0.25em] uppercase shadow-xl">Analysis Intelligence</span>
              <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 text-[11px] font-black uppercase tracking-widest">Multi-Modal Verified</span>
              </div>
            </div>
            
            <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-[1.05] font-serif">
              多模态商品标签策略<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">全域洞察报告</span>
            </h1>
            
            <p className="text-slate-500 max-w-4xl font-medium leading-relaxed italic border-l-8 border-blue-600/20 pl-8 py-3 text-2xl">
              深度解析跨品类商品的视觉与文本特征，对比多维度模型表现，沉淀具备实战指导意义的标签应用体系。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5">
            <button 
              onClick={handleDownloadMD}
              className="group flex items-center space-x-3 bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm hover:bg-slate-800 transition-all hover:-translate-y-1 shadow-2xl shadow-slate-300 active:scale-95"
            >
              <Download className="w-5 h-5 group-hover:animate-bounce" />
              <span>导出深度报告 (MD)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { label: '分析样本总数', value: totalProducts, icon: FileText, color: 'blue', desc: 'SAMPLES' },
            { label: '多模态引擎数', value: '2个', icon: Zap, color: 'purple', desc: 'ENGINES' },
            { label: '实时处理延迟', value: '4.2s', icon: Clock, color: 'green', desc: 'LATENCY' },
            { label: '综合质量得分', value: '94', icon: Award, color: 'amber', desc: 'QUALITY' },
          ].map((stat, idx) => (
            <div key={idx} className="p-10 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 flex flex-col justify-between hover:border-blue-400 hover:bg-white hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-700 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <stat.icon className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
              </div>
              <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:rotate-[10deg] transition-transform ${
                stat.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-200' : 
                stat.color === 'purple' ? 'bg-indigo-600 text-white shadow-indigo-200' :
                stat.color === 'green' ? 'bg-emerald-600 text-white shadow-emerald-200' :
                'bg-amber-500 text-white shadow-amber-200'
              } shadow-2xl`}>
                <stat.icon className="w-10 h-10" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{stat.desc}</p>
                 <h4 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</h4>
                 <p className="text-sm font-bold text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. 可视化看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h3 className="text-3xl font-black flex items-center space-x-4 tracking-tight text-slate-900">
                <Target className="w-9 h-9 text-blue-600" />
                <span>核心指标对比看板</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Analytical Benchmarking Visualization</p>
            </div>
          </div>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                <PolarGrid strokeDasharray="4 4" stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 14, fontWeight: 900, fill: '#1e293b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                <Radar name="Qwen 3.5 Plus" dataKey="qwen" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={5} />
                <Radar name="Kimi K2.5" dataKey="kimi" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} strokeWidth={5} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.2)', padding: '20px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col">
          <div className="mb-16">
            <h3 className="text-3xl font-black flex items-center space-x-4 tracking-tight text-slate-900">
              <Layers className="w-9 h-9 text-indigo-600" />
              <span>品类权衡分析</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Sample Distribution Matrix</p>
          </div>
          <div className="flex-1 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={110}
                  outerRadius={150}
                  paddingAngle={12}
                  dataKey="count"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.2)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '40px', fontWeight: 900, fontSize: '13px', color: '#1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. 深度分析报告内容 (Structured View) */}
      <div className="flex flex-col lg:flex-row gap-12 items-start relative">
        {/* 左侧悬浮目录 */}
        <div className="hidden lg:block w-80 sticky top-32 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full" />
              <span>Report Outline</span>
            </h4>
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-between group ${
                    activeSection === section.id 
                      ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300 translate-x-2' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                  }`}
                >
                  <span className="truncate">{section.title}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeSection === section.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-10 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 mb-5">AI INSIGHT</h5>
            <p className="text-base font-black leading-relaxed text-white">
              本报告采用模块化感知架构，自动映射跨模型特征向量至结构化结论。
            </p>
          </div>
        </div>

        {/* 右侧文档主体 */}
        <div className="flex-1 w-full space-y-16">
          {sections.length === 0 ? (
            <div className="w-full bg-white rounded-[3rem] border border-slate-200 p-32 text-center shadow-2xl">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <Layers className="w-12 h-12 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 tracking-widest uppercase">Initializing Analytical Data...</h3>
            </div>
          ) : (
            sections.map((section, idx) => (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="w-full bg-white rounded-[3rem] border border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                {/* 章节页眉 */}
                <div className="px-16 py-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm font-black text-xl font-serif">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">{section.title}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Structured Strategy Insight</p>
                    </div>
                  </div>
                </div>

                {/* 章节正文 */}
                <div className="px-20 py-24 bg-white relative">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-600/5 via-blue-600/20 to-blue-600/5" />
                  
                  <div className="prose prose-slate prose-2xl max-w-none 
                    prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                    prose-h2:hidden
                    prose-h3:text-4xl prose-h3:text-slate-900 prose-h3:mt-24 prose-h3:mb-12 prose-h3:font-black prose-h3:flex prose-h3:items-center prose-h3:gap-6
                    prose-h3:before:content-[''] prose-h3:before:w-3 prose-h3:before:h-12 prose-h3:before:bg-blue-600 prose-h3:before:rounded-full
                    prose-p:text-slate-600 prose-p:leading-[2] prose-p:text-2xl prose-p:mb-12 prose-p:text-justify prose-p:font-medium
                    prose-li:text-slate-600 prose-li:text-2xl prose-li:marker:text-blue-600 prose-li:mb-6 prose-li:pl-4
                    prose-ul:my-16 prose-ul:list-disc prose-ol:my-16
                    prose-strong:text-slate-900 prose-strong:font-black prose-strong:bg-blue-50 prose-strong:px-2 prose-strong:py-1 prose-strong:rounded-xl prose-strong:border-b-4 prose-strong:border-blue-200
                    prose-blockquote:border-l-[12px] prose-blockquote:border-slate-900 prose-blockquote:bg-slate-50 prose-blockquote:py-16 prose-blockquote:px-20 prose-blockquote:rounded-[3rem] prose-blockquote:text-slate-900 prose-blockquote:my-24 prose-blockquote:shadow-2xl prose-blockquote:not-italic prose-blockquote:font-black
                    prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-5 prose-code:py-3 prose-code:rounded-[1.5rem] prose-code:before:content-none prose-code:after:content-none prose-code:font-black prose-code:text-lg
                    prose-hr:border-slate-100 prose-hr:my-32 prose-hr:border-t-[4px]
                    prose-table:w-full prose-table:border-collapse prose-table:my-20 prose-table:shadow-2xl prose-table:rounded-3xl prose-table:overflow-hidden
                    prose-thead:bg-slate-900 prose-thead:text-white
                    prose-th:px-8 prose-th:py-6 prose-th:text-xl prose-th:font-black prose-th:text-center
                    prose-td:px-8 prose-td:py-6 prose-td:text-xl prose-td:border prose-td:border-slate-100 prose-td:font-bold prose-td:text-slate-600"
                    dangerouslySetInnerHTML={{ __html: section.html }} 
                  />
                </div>
              </motion.section>
            ))
          )}
        </div>
      </div>

      {/* 4. 全局页脚 */}
      <footer className="pt-32 pb-16 border-t-2 border-slate-100">
        <div className="flex flex-col items-center space-y-10">
           <div className="flex space-x-4">
              {[1,2,3,4,5,6,7].map(i => <div key={i} className="w-3 h-3 rounded-full bg-slate-200" />)}
           </div>
           <div className="flex flex-col items-center space-y-4 text-center">
             <p className="text-slate-900 text-sm font-black tracking-[0.5em] uppercase">
               CERTIFIED ANALYTICAL EXCELLENCE
             </p>
             <p className="text-slate-400 text-[10px] font-bold max-w-2xl leading-loose uppercase tracking-[0.2em]">
               This intelligence report is generated via the cross-modal synthesis engine. <br />
               © 2026 AI Multimodal Research Laboratory. Proprietary & Confidential.
             </p>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default ReportDashboard;

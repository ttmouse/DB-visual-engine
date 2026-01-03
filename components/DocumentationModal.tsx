
import React from 'react';
import { Icons } from './Icons';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const features = [
    {
      title: "1. 7-Layer 物理逆向协议",
      desc: "系统专有的精密解构逻辑：意图 > 母体 > 空间 > 语义 > 材质 > 构图 > 技术。确保从底层物理逻辑上 1:1 复刻任何视觉资产。",
      op: "上传资产后自动触发。在 Studio 面板可查看每一层的详细解构报告。"
    },
    {
      title: "2. Blueprint 蓝图框选系统",
      desc: "利用高精度物体检测模型识别画面的 2D 空间坐标。自动标记主体 (Primary)、次要元素 (Secondary) 及装饰物 (Graphic) 的精准位置，防止生成时的空间错乱。",
      op: "点击源图右下角的 'BLUEPRINT' 按钮。系统会叠加彩色边框和标签，展示 AI 对画面构图的实时理解。"
    },
    {
      title: "3. 全局粘贴与拖拽支持 (Paste-to-Upload)",
      desc: "支持从剪贴板直接粘贴图片或视频，极大提升了素材搜集与复刻的工作效率。",
      op: "在上传页面直接按 Ctrl+V (Win) 或 Cmd+V (Mac) 即可立即预览资产并开始分析。"
    },
    {
      title: "4. 双语工作台 (MJ 模式缓存)",
      desc: "内置专业级翻译引擎。支持在中文物理协议与 Midjourney 专用英文提示词之间无缝切换。所有修改均有本地缓存，防止丢失。",
      op: "在 Studio 面板点击右上角 '中/EN' 开关。您可以手动编辑任意语言版本的提示词，点击生成后系统会自动同步。"
    },
    {
      title: "5. Precision QA 质检闭环",
      desc: "逐像素比对 Source 与 Replica。提取由于模型理解偏差导致的材质、光影或空间错误，并转化为可勾选的“调优指令”。",
      op: "生成图片后自动/手动触发。勾选您满意的修订建议，点击 '应用修订'，系统将进行增量式重绘优化。"
    },
    {
      title: "6. Sora 视频流逆向与时长控制",
      desc: "针对 Sora/Veo 级视频进行逐帧解析。支持解析运镜轨迹、物理特性（如流体、布料）及动态光影。",
      op: "上传视频后，设定需要解析的视频长度（秒），点击开始分析。系统将生成一份包含时间轴动态描述的脚本提示词。"
    },
    {
      title: "7. 资产库自动持久化",
      desc: "采用 IndexedDB 技术，自动加密存储您的所有历史复刻记录。即使刷新页面或浏览器意外关闭，工作进度依然安全。",
      op: "点击导航栏右上角 '历史记录' 即可找回任何一个历史复刻版本。支持点击历史项直接恢复到当前工作台。"
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <Icons.Help size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-800 leading-tight">DB 功能规格手册</h3>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Enterprise Edition v2.5.7</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors"><Icons.X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
          {features.map((f, i) => (
            <div key={i} className="group p-5 rounded-2xl border border-stone-100 hover:border-orange-100 hover:bg-orange-50/20 transition-all">
              <h4 className="font-bold text-stone-900 flex items-center gap-2 mb-2">
                <span className="text-orange-500 text-xs font-mono">{i + 1}.</span>
                {f.title}
              </h4>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">{f.desc}</p>
              <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Icons.Play size={10} className="text-orange-500" /> 操作指引</p>
                <p className="text-xs text-stone-700 font-medium">{f.op}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-center text-[10px] text-stone-400 font-mono italic">
          DB Visual Engine | All Rights Reserved 2024
        </div>
      </div>
    </div>
  );
};

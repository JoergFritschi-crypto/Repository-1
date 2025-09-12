import { 
  Palette, Paintbrush, Wand2, Compass, PenTool,
  Flower, Flower2, Sprout, TreePine, Leaf,
  Hammer, Wrench, Settings, Cog, Tool,
  Scissors, CircleDot, Target, Zap,
  Sparkles, Crown, Star, Gem,
  Mountain, Sun, CloudRain, Wind
} from 'lucide-react';

export default function IconShowcase() {
  const gardenIcons = [
    { icon: Flower, name: 'Flower', desc: 'Classic flower - elegant and natural' },
    { icon: Flower2, name: 'Flower2', desc: 'Alternative flower style' },
    { icon: Sprout, name: 'Sprout', desc: 'Growing plant - represents growth/development' },
    { icon: TreePine, name: 'TreePine', desc: 'Tree icon - nature/landscaping' },
    { icon: Leaf, name: 'Leaf', desc: 'Simple leaf - minimal and clean' }
  ];

  const designIcons = [
    { icon: Palette, name: 'Palette', desc: 'Design/creativity - current choice' },
    { icon: Paintbrush, name: 'Paintbrush', desc: 'Artistic creation' },
    { icon: Wand2, name: 'Wand2', desc: 'Magic/transformation - AI design' },
    { icon: Compass, name: 'Compass', desc: 'Precision/planning' },
    { icon: PenTool, name: 'PenTool', desc: 'Design tool - professional' }
  ];

  const toolIcons = [
    { icon: Tool, name: 'Tool', desc: 'General tool - construction/building' },
    { icon: Hammer, name: 'Hammer', desc: 'Building/construction' },
    { icon: Wrench, name: 'Wrench', desc: 'Maintenance/adjustment' },
    { icon: Settings, name: 'Settings', desc: 'Configuration/customization' },
    { icon: Scissors, name: 'Scissors', desc: 'Pruning/trimming' }
  ];

  const specialIcons = [
    { icon: Sparkles, name: 'Sparkles', desc: 'AI magic - perfect for AI-powered design' },
    { icon: Zap, name: 'Zap', desc: 'Energy/power - dynamic creation' },
    { icon: Target, name: 'Target', desc: 'Precision/goal-oriented' },
    { icon: Star, name: 'Star', desc: 'Excellence/premium feature' },
    { icon: Crown, name: 'Crown', desc: 'Premium/luxury - high-end service' }
  ];

  const IconGrid = ({ icons, title }: { icons: any[], title: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 text-[#004025]">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {icons.map(({ icon: Icon, name, desc }) => (
          <div key={name} className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
            <div className="w-12 h-12 flex items-center justify-center mb-2">
              <Icon className="w-8 h-8 text-[#004025]" />
            </div>
            <div className="text-sm font-medium text-center">{name}</div>
            <div className="text-xs text-gray-500 text-center mt-1">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-[#004025]">Available Icons for Garden Design Studio</h1>
        <p className="text-gray-600 mb-8">Choose from these Lucide React icons - all will have perfect transparency and match your British racing green theme</p>
        
        <IconGrid icons={gardenIcons} title="🌱 Garden & Nature Icons" />
        <IconGrid icons={designIcons} title="🎨 Design & Creativity Icons" />
        <IconGrid icons={toolIcons} title="🔧 Tool & Construction Icons" />
        <IconGrid icons={specialIcons} title="✨ Special & Premium Icons" />
        
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-[#004025] mb-2">💡 Recommendations:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><strong>Sparkles</strong> - Perfect for AI-powered design studio</li>
            <li><strong>Compass</strong> - Represents precision garden planning</li>
            <li><strong>Flower2</strong> - Beautiful and directly garden-related</li>
            <li><strong>Wand2</strong> - Magic of AI garden transformation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FacilityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FacilityCard({ icon: Icon, title, description, index }: FacilityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white dark:bg-card rounded-xl p-8 shadow-lg shadow-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-border/50 group"
    >
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300 text-primary">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold font-display text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

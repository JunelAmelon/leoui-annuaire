import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  vendorCount: number;
  imageUrl: string;
}

export default function CategoryCard({
  title,
  description,
  icon: Icon,
  href,
  vendorCount,
  imageUrl,
}: CategoryCardProps) {
  return (
    <Link href={href} className="group block">
      <article className="relative h-80 rounded-2xl overflow-hidden shadow-soft-lg hover:shadow-soft-xl transition-all duration-300">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-600 transition-colors duration-300">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-serif text-heading-md text-white mb-2">
            {title}
          </h3>
          <p className="text-body-sm text-white/90 mb-3">
            {description}
          </p>
          <p className="text-body-sm text-white/80">
            {vendorCount} prestataires
          </p>
        </div>
      </article>
    </Link>
  );
}

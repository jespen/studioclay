import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Portfolio | Studio Clay',
  description: 'Explore our creative work and design projects for various clients.',
};

const projects = [
  {
    id: 1,
    title: 'Eco Packaging Redesign',
    category: 'Branding',
    description: 'A complete redesign of eco-friendly packaging for a sustainable product line.',
    image: '/portfolio-1.jpg',
    link: '/portfolio/eco-packaging',
  },
  {
    id: 2,
    title: 'Modern E-commerce Platform',
    category: 'Web Design',
    description: 'A user-friendly e-commerce platform designed for optimal conversion and user experience.',
    image: '/portfolio-2.jpg',
    link: '/portfolio/ecommerce-platform',
  },
  {
    id: 3,
    title: 'Financial App Interface',
    category: 'UI/UX Design',
    description: 'An intuitive mobile app interface for personal finance management and investment tracking.',
    image: '/portfolio-3.jpg',
    link: '/portfolio/financial-app',
  },
  {
    id: 4,
    title: 'Luxury Brand Campaign',
    category: 'Digital Marketing',
    description: 'A comprehensive digital marketing campaign for a high-end luxury brand.',
    image: '/portfolio-4.jpg',
    link: '/portfolio/luxury-campaign',
  },
  {
    id: 5,
    title: 'Restaurant Menu Redesign',
    category: 'Print Design',
    description: 'A beautiful and functional menu design for an upscale restaurant.',
    image: '/portfolio-1.jpg',
    link: '/portfolio/restaurant-menu',
  },
  {
    id: 6,
    title: 'Fitness App Interface',
    category: 'Mobile Design',
    description: 'A user-friendly fitness app interface designed for optimal user experience.',
    image: '/portfolio-2.jpg',
    link: '/portfolio/fitness-app',
  },
  {
    id: 7,
    title: 'Corporate Identity System',
    category: 'Branding',
    description: 'A complete corporate identity system including logo, business cards, and stationery.',
    image: '/portfolio-3.jpg',
    link: '/portfolio/corporate-identity',
  },
  {
    id: 8,
    title: 'Product Catalog',
    category: 'Print Design',
    description: 'A comprehensive product catalog design for a major retail brand.',
    image: '/portfolio-4.jpg',
    link: '/portfolio/product-catalog',
  },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Our <span className="text-primary">Portfolio</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Explore our collection of creative projects and design work that showcases our expertise and approach to solving design challenges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <Link key={project.id} href={project.link} className="group">
                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-transform duration-300 group-hover:translate-y-[-5px]">
                  <div className="relative overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-secondary/20"></div>
                  </div>
                  <div className="p-6 flex-grow">
                    <span className="text-primary text-sm font-medium block mb-2">{project.category}</span>
                    <h3 className="text-xl font-semibold mb-3">{project.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                    <span className="inline-flex items-center text-sm font-medium text-accent">
                      View Project
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 
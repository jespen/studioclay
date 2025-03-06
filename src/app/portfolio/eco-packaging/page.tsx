import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata = {
  title: 'Eco Packaging Redesign | Studio Clay',
  description: 'A complete redesign of eco-friendly packaging for a sustainable product line.',
};

export default function EcoPackagingProject() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container-custom">
          {/* Project header */}
          <div className="mb-12">
            <div className="flex items-center mb-8">
              <Link href="/portfolio" className="text-primary flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back to All Projects
              </Link>
            </div>
            <span className="text-primary text-sm font-medium block mb-2">Branding</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Eco Packaging Redesign
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl">
              A complete redesign of eco-friendly packaging for a sustainable product line, focused on minimizing environmental impact while maximizing brand recognition.
            </p>
          </div>

          {/* Project showcase */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-16">
            <div className="aspect-video bg-gradient-to-b from-primary/20 to-secondary/20 flex items-center justify-center">
              <div className="text-center p-8 bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg max-w-lg">
                <h3 className="text-2xl font-semibold mb-4">Project Image Would Appear Here</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This is where the main project image would be displayed.
                </p>
              </div>
            </div>
          </div>

          {/* Project details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Project Overview</h2>
              <div className="prose dark:prose-invert max-w-none">
                <p>
                  For this project, we were tasked with completely redesigning the packaging for a line of eco-friendly products. The client wanted to emphasize their commitment to sustainability while creating a distinctive visual identity that would stand out on store shelves.
                </p>
                <p>
                  Our approach focused on using minimalist design principles with nature-inspired elements to create a clean, contemporary look that aligned with the brand's values. We developed a color palette of soft earth tones complemented by vibrant accents to create visual interest.
                </p>
                <h3>Key Challenges</h3>
                <ul>
                  <li>Creating distinctive packaging using only sustainable materials</li>
                  <li>Maintaining brand consistency across a diverse product line</li>
                  <li>Ensuring all packaging elements could be easily recycled or composted</li>
                  <li>Communicating product benefits clearly while maintaining design aesthetics</li>
                </ul>
                <h3>The Solution</h3>
                <p>
                  We developed a comprehensive packaging system that utilized recycled paper and cardboard with soy-based inks. The designs incorporated botanical illustrations and a modular layout system that could be easily adapted for different products while maintaining a cohesive look.
                </p>
                <p>
                  Each package includes clear information about its eco-friendly materials and disposal instructions, reinforcing the brand's commitment to sustainability through every aspect of the design.
                </p>
              </div>
            </div>
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 sticky top-32 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-6">Project Details</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm uppercase text-gray-500 dark:text-gray-400 mb-1">Client</h4>
                    <p className="font-medium">EcoLife Products</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase text-gray-500 dark:text-gray-400 mb-1">Services</h4>
                    <p className="font-medium">Packaging Design, Brand Identity, Graphic Design</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase text-gray-500 dark:text-gray-400 mb-1">Timeline</h4>
                    <p className="font-medium">3 months</p>
                  </div>
                  <div>
                    <h4 className="text-sm uppercase text-gray-500 dark:text-gray-400 mb-1">Year</h4>
                    <p className="font-medium">2023</p>
                  </div>
                </div>
                <div className="mt-8">
                  <Link href="/contact" className="btn btn-primary w-full justify-center text-center">
                    Start a Similar Project
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Next project */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Next Project</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Explore more of our work
              </p>
            </div>
            <Link href="/portfolio/ecommerce-platform" className="block group">
              <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-transform duration-300 group-hover:translate-y-[-5px]">
                <div className="relative aspect-[21/9] bg-gradient-to-b from-primary/20 to-secondary/20 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <span className="text-primary text-sm font-medium block mb-2">Web Design</span>
                    <h3 className="text-2xl font-semibold mb-2">Modern E-commerce Platform</h3>
                    <span className="inline-flex items-center text-sm font-medium text-accent">
                      View Project
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, DollarSign, ShieldCheck, Headphones, Zap, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import placeholderImages from '@/lib/placeholder-images.json';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export default function WebstitePage() {

  const howItWorksSteps = [
    {
      icon: <Cpu className="h-10 w-10 text-primary" />,
      title: "1. You Invest",
      description: "Choose an investment package that aligns with your financial goals. Longer investment periods yield greater returns."
    },
    {
      icon: <Zap className="h-10 w-10 text-primary" />,
      title: "2. We Operate",
      description: "Your investment is pooled to cover the critical operational costs of our mining fleet, primarily electricity and hardware maintenance."
    },
    {
      icon: <DollarSign className="h-10 w-10 text-primary" />,
      title: "3. You Earn",
      description: "Our rigs generate significant crypto value daily. You receive a consistent share of these earnings directly to your account."
    }
  ];

  const whyChooseUsFeatures = [
    {
      icon: <Cpu className="h-8 w-8 text-primary" />,
      title: "Advanced Technology",
      description: "We utilize the latest generation of ASIC miners to maximize efficiency and profitability, ensuring the best possible returns."
    },
    {
        icon: <ShieldCheck className="h-8 w-8 text-primary" />,
        title: "Security First",
        description: "Your investments and data are protected with industry-leading security protocols and multi-layered protection."
    },
    {
        icon: <TrendingUp className="h-8 w-8 text-primary" />,
        title: "Transparent Earnings",
        description: "Track your daily earnings and watch your investment grow in real-time through your personal dashboard."
    },
    {
        icon: <Headphones className="h-8 w-8 text-primary" />,
        title: "Dedicated Support",
        description: "Our expert support team is available via our official WhatsApp channel to assist you with any questions or concerns."
    }
  ];

  const faqs = [
    {
      question: "Is my investment secure?",
      answer: "Yes, security is our top priority. We use state-of-the-art cybersecurity measures to protect our infrastructure and your data. Furthermore, our operations are diversified across multiple locations to mitigate physical risks."
    },
    {
        question: "How does YieldLink make money?",
        answer: "Our revenue is generated directly from the cryptocurrency our mining fleet produces. A portion of these earnings is shared with our investors as their daily return, while the remainder covers our operational costs (electricity, maintenance, staffing) and our profit margin."
    },
    {
        question: "What are the fees for withdrawal?",
        answer: "We charge a standard 15% service fee on all withdrawals to cover transaction costs and contribute to our operational reserves. This ensures the sustainability of the platform. We also offer periodic fee-free withdrawal days as a bonus to our members."
    },
    {
        question: "Can I have multiple accounts?",
        answer: "No, to ensure fairness and compliance, we strictly enforce a policy of one account per person. Our system actively monitors for multiple account abuse, which can lead to suspension."
    },
  ];

  return (
    <div className="flex flex-col">
        {/* Hero Section */}
        <section className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center text-center text-white overflow-hidden">
             <div className="absolute inset-0 z-0">
                <Image
                    src={placeholderImages.heroMiner.src}
                    alt="Background of bitcoin miners"
                    fill
                    className="object-cover"
                    data-ai-hint={placeholderImages.heroMiner.hint}
                    priority
                />
                <div className="absolute inset-0 bg-black/60" />
            </div>
            <div className="container relative z-10 mx-auto px-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
                    Unlock the Power of Industrial Crypto Mining
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-primary-foreground/90 drop-shadow-md">
                    YieldLink gives you direct access to the returns of large-scale crypto mining. We manage the hardware and operations, you enjoy the daily rewards.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/dashboard/invest">Invest Now</Link>
                </Button>
            </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight">What is YieldLink?</h2>
                    <p className="text-muted-foreground">
                        YieldLink is a forward-thinking investment company specializing in cryptocurrency mining. We own and operate a large fleet of high-performance mining rigs—powerful computers specifically designed to solve complex cryptographic problems and generate new cryptocurrency.
                    </p>
                    <p className="text-muted-foreground">
                        Our business model is simple and transparent: we leverage investor capital to maintain and expand our mining operations. This includes covering the significant costs of electricity, cooling, and hardware upkeep. In return for their contribution to our operational capacity, our investors receive a consistent daily income based on the proven performance of our mining fleet.
                    </p>
                </div>
                 <div>
                    <Image
                        src={placeholderImages.aboutMiners.src}
                        alt="A row of crypto mining rigs"
                        width={placeholderImages.aboutMiners.width}
                        height={placeholderImages.aboutMiners.height}
                        className="rounded-lg shadow-lg"
                        data-ai-hint={placeholderImages.aboutMiners.hint}
                    />
                </div>
            </div>
        </section>

        {/* How It Works Section */}
         <section id="features" className="py-16 md:py-24 bg-secondary/50">
            <div className="container mx-auto px-4">
                 <div className="text-center space-y-4 mb-12">
                     <h2 className="text-3xl font-bold tracking-tight">How You Profit From Our Power</h2>
                     <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        We've streamlined the process of earning from crypto mining into three simple steps.
                     </p>
                 </div>
                 <div className="grid md:grid-cols-3 gap-8">
                    {howItWorksSteps.map((feature) => (
                        <Card key={feature.title} className="text-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <CardHeader>
                                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                                    {feature.icon}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                               <h3 className="text-xl font-bold">{feature.title}</h3>
                               <p className="text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                 </div>
            </div>
        </section>

         {/* Why Choose Us Section */}
        <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                 <div className="order-last md:order-first">
                    <Image
                        src={placeholderImages.whyChooseMiners.src}
                        alt="Secure bitcoin mining hardware"
                        width={placeholderImages.whyChooseMiners.width}
                        height={placeholderImages.whyChooseMiners.height}
                        className="rounded-lg shadow-lg"
                        data-ai-hint={placeholderImages.whyChooseMiners.hint}
                    />
                </div>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Why Choose YieldLink?</h2>
                        <p className="text-muted-foreground">We are committed to providing a secure, transparent, and profitable platform for all our investors.</p>
                    </div>
                    <div className="space-y-6">
                        {whyChooseUsFeatures.map((feature) => (
                            <div key={feature.title} className="flex items-start gap-4">
                                {feature.icon}
                                <div className="space-y-1">
                                    <h4 className="font-semibold">{feature.title}</h4>
                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24 bg-secondary/50">
             <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center space-y-4 mb-12">
                     <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                     <p className="text-lg text-muted-foreground">
                        Have questions? We have answers. Here are some of the most common queries from our investors.
                     </p>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq) => (
                         <AccordionItem value={faq.question} key={faq.question}>
                            <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                            <AccordionContent>
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
             </div>
        </section>
        
        {/* Call to Action Section */}
        <section className="py-20 md:py-32 bg-background">
            <div className="container mx-auto px-4 text-center">
                 <h2 className="text-3xl font-bold tracking-tight">Ready to Start Earning?</h2>
                 <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Join YieldLink today and turn our mining power into your daily profit. Create your account in minutes and make your first investment.
                </p>
                 <Button asChild size="lg" className="mt-8">
                    <Link href="/dashboard/invest">Invest Now</Link>
                </Button>
            </div>
        </section>
    </div>
  )
}

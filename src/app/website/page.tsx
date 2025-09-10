
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Cpu, DollarSign, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import placeholderImages from '@/lib/placeholder-images.json';


export default function WebstitePage() {

  const features = [
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
      description: "Our rigs generate up to $20,000 in crypto value daily. You receive a consistent share of these earnings directly to your account."
    }
  ];

  return (
    <div className="flex flex-col">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-secondary">
            <div className="container mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary">
                    Unlock the Power of Crypto Mining
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
                    YieldLink gives you direct access to the returns of industrial-scale crypto mining. We manage the hardware, you enjoy the daily rewards.
                </p>
                <Button asChild size="lg" className="mt-8">
                    <Link href="/auth">Get Started</Link>
                </Button>
            </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 md:py-24">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight">What is YieldLink?</h2>
                    <p className="text-muted-foreground">
                        YieldLink is a forward-thinking investment company specializing in cryptocurrency mining. We own and operate a large fleet of high-performance mining rigs—powerful computers specifically designed to generate new cryptocurrency.
                    </p>
                    <p className="text-muted-foreground">
                        Our business model is simple: we leverage investor capital to maintain and expand our mining operations. This includes covering the significant costs of electricity, cooling, and hardware upkeep. In return for their contribution to our operational capacity, our investors receive a consistent daily income based on the performance of our mining fleet.
                    </p>
                </div>
                 <div>
                    <Image
                        src={placeholderImages.cryptoFarm.src}
                        alt="A row of crypto mining rigs"
                        width={placeholderImages.cryptoFarm.width}
                        height={placeholderImages.cryptoFarm.height}
                        className="rounded-lg shadow-lg"
                        data-ai-hint={placeholderImages.cryptoFarm.hint}
                    />
                </div>
            </div>
        </section>

        {/* Features Section */}
         <section id="features" className="py-16 md:py-24 bg-secondary">
            <div className="container mx-auto px-4">
                 <div className="text-center space-y-4 mb-12">
                     <h2 className="text-3xl font-bold tracking-tight">How You Profit From Our Power</h2>
                     <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                        We've streamlined the process of earning from crypto mining into three simple steps.
                     </p>
                 </div>
                 <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <Card key={feature.title} className="text-center">
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
        
        {/* Call to Action Section */}
        <section className="py-20 md:py-32">
            <div className="container mx-auto px-4 text-center">
                 <h2 className="text-3xl font-bold tracking-tight">Ready to Start Earning?</h2>
                 <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Join YieldLink today and turn our mining power into your daily profit. Longer investment periods mean greater and more sustained returns.
                </p>
                 <Button asChild size="lg" className="mt-8">
                    <Link href="/auth">Create Your Account</Link>
                </Button>
            </div>
        </section>
    </div>
  )
}

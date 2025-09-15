
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Landmark, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';

// --- Automated Bot Transaction Data ---

// A more structured and culturally aware approach to name generation.
// We pair common Christian/English names with vernacular surnames from major communities.
const christianNames = ["Abigael","Abraham","Adam","Adrian","Agnes","Albert","Alex","Alexander","Alice","Alicia","Alvin","Amina","Amos","Anderson","Andrew","Angela","Ann","Anna","Anne","Anthony","Arnold","Ashley","Asher","Austin","Barbra","Beatrice","Ben","Benjamin","Benson","Bernard","Bertha","Betty","Bonface","Brenda","Brian","Bridget","Brighton","Bruce","Calvin","Carl","Caroline","Catherine","Caleb","Cecilia","Charles","Charity","Charlotte","Chris","Christian","Christine","Christopher","Claire","Clara","Clare","Clement","Collins","Colman","Cynthia","Daisy","Damaris","Daniel","David","Davies","Debora","Denis","Dennis","Derick","Diana","Donald","Doreen","Doris","Dorothy","Douglas","Duncan","Dylan","Edgar","Edith","Edmond","Edna","Edu","Edward","Edwin","Elia","Elias","Elijah","Elikanah","Elizabeth","Elsa","Elsie","Elvis","Emmanuel","Erick","Eric","Ernest","Esther","Eunice","Eva","Evans","Everlyne","Faith","Fatuma","Felix","Ferdinand","Festus","Fidel","Florence","Francis","Frank","Fred","Frederick","Geoffrey","George","Getrude","Gideon","Gilbert","Gladwell","Gladys","Gloria","Godfrey","Grace","Habiba","Halima","Hellen","Henry","Hilda","Hillary","Hope","Hussein","Ian","Ibrahim","Immanuel","Irene","Isaac","Ismael","Israel","Ivan","Ivy","Jack","Jackline","Jackson","Jacob","James","Jane","Janet","Jason","Jeff","Jennifer","Jeremiah","Jeremy","Jerry","Jessica","Joan","Joash","Joel","John","Jona","Jonathan","Joseph","Josephine","Joshua","Joy","Joyce","Jude","Judith","Juliana","Juliet","Julius","Junior","Justin","Justus","Karen","Kate","Kelvin","Ken","Kennedy","Kenneth","Kevin","Laura","Lauren","Lawrence","Leah","Lilian","Linda","Lisa","Lorna","Louis","Lucas","Lucy","Lydia","Lynette","Magdalene","Margaret","Mark","Martha","Martin","Mary","Mathew","Maureen","Maurice","Maxwell","Melvin","Mercy","Michael","Michelle","Mike","Mildred","Milicent","Miriam","Mitchelle","Mohammed","Morris","Moses","Muriam","Nancy","Naomi","Nathan","Nelson","Nelly","Newton","Nicholas","Nickson","Noah","Noel","Norah","Norman","Oliver","Olivia","Oscar","Owen","Pamela","Pascal","Patricia","Patrick","Paul","Pauline","Peter","Philip","Phylis","Purity","Rachael","Rachel","Ralph","Randolph","Raphael","Raymond","Reagan","Rebecca","Regina","Reuben","Rhoda","Richard","Rita","Robert","Robbin","Rodgers","Ronald","Ronny","Rose","Rosemary","Roy","Ruth","Sabina","Said","Salim","Sam","Sammy","Samuel","Sandra","Sarah","Saumu","Sharon","Shaun","Sheila","Shirley","Sidney","Silas","Simon","Solomon","Sophia","Stacy","Stanley","Stella","Stephen","Steve","Steven","Susan","Sylus","Sylvia","Teresa","Thomas","Timothy","Titus","Tobias","Tom","Tony","Tracy","Valentine","Valerie","Venessa","Vero","Veronica","Victor","Victoria","Vincent","Viola","Violet","Virginia","Vivian","Walter","Wendy","Wilfred","Wilkister","William","Willy","Wilson","Winnie","Wycliff","Yvonne","Yvone","Zachariah","Zainab","Zipporah"];
const surnamesByCommunity = {
    kikuyu: ["Mbugua", "Njogu", "Kamau", "Njoroge", "Maina", "Mwangi", "Kariuki", "Gitau", "Ng'ang'a", "Wanjiru", "Wambui", "Njeri", "Wanjiku", "Waithera", "Nyambura", "Wairimu", "Muthoni", "Wangari", "Wangui"],
    luhya: ["Wamalwa", "Wafula", "Simiyu", "Nekesa", "Wanyonyi", "Khisa", "Juma", "Nasimiyu", "Wangila", "Masinde", "Barasa", "Situma", "Wekesa", "Nafula"],
    kalenjin: ["Kiprotich", "Chebet", "Kipkoech", "Cherono", "Kipkirui", "Chepkoech", "Kipkemboi", "Jepkemboi", "Kipruto", "Jepchirchir", "Kibet", "Cheptoo", "Koech", "Jepkosgei", "Kiptoo", "Jebet"],
    luo: ["Ochieng'", "Achieng'", "Otieno", "Atieno", "Onyango", "Anyango", "Okoth", "Akoth", "Ouma", "Auma", "Owino", "Awino", "Omondi", "Amondi", "Okinyi", "Akinyi"],
    kamba: ["Mutua", "Musyoka", "Nthenya", "Muthama", "Mutuku", "Mwikali", "Kyalo", "Mwende", "Mutisya", "Nduku", "Kioko", "Wayua", "Wambua", "Syombua"],
    kisii: ["Ondieki", "Nyaboke", "Mogaka", "Kwamboka", "Nyamweya", "Kerubo", "Osoro", "Moraa", "Ombasa", "Bwari", "Gichana", "Kemunto"],
    meru: ["Murithi", "Muthomi", "Kendi", "Kinoti", "Nkatha", "Kimathi", "Makena", "Muriuki", "Karimi", "Mugambi", "Kinya"],
    maasai: ["Ole Tipis", "Naserian", "Ole Metu", "Naisiae", "Ole Ntimama", "Naneu", "Lekakeny", "Simantoi"],
    mijikenda: ["Mdigo", "Wanje", "Chai", "Mbeyu", "Tsuma", "Kwekwe", "Kenga", "Dama"],
    somali: ["Hassan", "Ali", "Abdi", "Fatuma", "Ibrahim", "Amina", "Mohamed", "Halima", "Hussein", "Asha"]
};


const transactionTypes: ('Deposit' | 'Withdrawal')[] = ['Deposit', 'Withdrawal'];
const paymentMethods = ["M-PESA", "M-PESA", "M-PESA", "M-PESA", "Bank Transfer", "M-PESA"];

interface BotTransaction {
    id: string;
    type: 'Deposit' | 'Withdrawal';
    userName: string;
    amount: number;
    timestamp: Date;
    modeOfPayment: string;
    transactionCode: string;
}

const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const generateRandomTransaction = (): BotTransaction => {
    // Generate a realistic Kenyan name
    const communityKeys = Object.keys(surnamesByCommunity);
    const randomCommunityKey = communityKeys[Math.floor(Math.random() * communityKeys.length)];
    const surnames = surnamesByCommunity[randomCommunityKey as keyof typeof surnamesByCommunity];

    const firstName = christianNames[Math.floor(Math.random() * christianNames.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];

    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
    const modeOfPayment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    let amount;
    if (type === 'Deposit') {
        amount = Math.floor(Math.random() * (20000 - 3000 + 1) + 3000);
    } else {
        amount = Math.floor(Math.random() * (50000 - 5000 + 1) + 5000);
    }
    // Make the amount a round number, which is more realistic
    amount = Math.round(amount / 100) * 100;

    const fullCode = 'TI' + generateRandomString(8);
    // Mask the transaction code for realism and security feel
    const transactionCode = `${fullCode.substring(0, 3)}...${fullCode.substring(7)}`;


    return {
        id: new Date().getTime().toString() + Math.random(),
        type: type,
        userName: `${firstName} ${lastName}`,
        amount: amount,
        timestamp: new Date(),
        modeOfPayment: modeOfPayment,
        transactionCode: transactionCode,
    };
};


export default function LatestTransactions() {
  const [transactions, setTransactions] = useState<BotTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialTransactions = Array.from({ length: 5 }, generateRandomTransaction).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
    setTransactions(initialTransactions);
    setLoading(false);

    // This interval creates the "live" feeling
    const interval = setInterval(() => {
      const newTx = generateRandomTransaction();
      setTransactions(prev => 
        // Add the new transaction to the top and keep the list at 7 items
        [newTx, ...prev].slice(0, 7)
      );
    }, 5000); // A new transaction appears every 5 seconds

    return () => clearInterval(interval);
  }, []);
  
  const getPaymentIcon = (method: string) => {
    switch (method) {
        case "M-PESA": return <Smartphone className="h-4 w-4" />;
        case "Bank Transfer": return <Landmark className="h-4 w-4" />;
        default: return <Banknote className="h-4 w-4" />;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Transactions</CardTitle>
        <CardDescription>
          See the latest approved deposits and withdrawals on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-grow space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
                 <Skeleton className="h-5 w-1/4" />
             </div>
          ))}
          {!loading && transactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No recent approved transactions.
            </p>
          )}
          {!loading && transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4">
              <div>
                {tx.type === 'Deposit' ? (
                  <ArrowUpCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="flex-grow space-y-1">
                <p className="font-medium">{tx.type} by {tx.userName}</p>
                <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>{formatDistanceToNow(tx.timestamp, { addSuffix: true })}</span>
                    <span className="flex items-center gap-1">{getPaymentIcon(tx.modeOfPayment)} {tx.modeOfPayment}</span>
                    <span className="font-mono text-xs hidden sm:inline">ID: {tx.transactionCode}</span>
                </div>
              </div>
              <div className="font-bold text-right">
                {formatCurrency(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

    
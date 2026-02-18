import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Download, FileSpreadsheet, Share2, ChevronDown, ChevronRight } from 'lucide-react';

// Simple Label component
const Label = ({ htmlFor, className, children }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium ${className || ''}`}>
    {children}
  </label>
);

const EMICalculator = () => {
  // State for loan parameters
  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(10.5);
  const [loanTerm, setLoanTerm] = useState(5);
  const [tenureType, setTenureType] = useState('years');
  const [emiScheme, setEmiScheme] = useState('arrears');
  
  // State for calculated values
  const [emi, setEmi] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});

  // Min/Max values
  const minLoanAmount = 0;
  const maxLoanAmount = 2000000;
  const minInterestRate = 5;
  const maxInterestRate = 20;
  const minLoanTerm = 0;
  const maxLoanTerm = 7;

  // Calculate EMI whenever inputs change
  useEffect(() => {
    calculateEMI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, interestRate, loanTerm, tenureType, emiScheme]);

  const calculateEMI = () => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly interest rate
    const months = tenureType === 'years' ? parseFloat(loanTerm) * 12 : parseFloat(loanTerm);

    if (principal <= 0 || rate <= 0 || months <= 0) {
      setEmi(0);
      setTotalInterest(0);
      setTotalPayment(0);
      setYearlyBreakdown([]);
      return;
    }

    // EMI calculation formula
    let monthlyEMI;
    if (emiScheme === 'advance') {
      // EMI in Advance
      monthlyEMI = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) / (1 + rate);
    } else {
      // EMI in Arrears (standard)
      monthlyEMI = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    }

    const totalAmount = monthlyEMI * months;
    const totalInt = totalAmount - principal;

    setEmi(Math.round(monthlyEMI));
    setTotalInterest(Math.round(totalInt));
    setTotalPayment(Math.round(totalAmount));

    // Calculate yearly breakdown
    calculateYearlyBreakdown(principal, rate, monthlyEMI, months);
  };

  const calculateYearlyBreakdown = (principal, monthlyRate, monthlyEMI, totalMonths) => {
    const breakdown = [];
    let balance = principal;
    let currentMonth = 0;

    const totalYears = Math.ceil(totalMonths / 12);

    for (let year = 0; year < totalYears; year++) {
      const yearData = {
        year: new Date().getFullYear() + year,
        principalPaid: 0,
        interestPaid: 0,
        totalPayment: 0,
        balance: 0,
        months: [],
        loanPaidToDate: 0
      };

      const monthsInYear = Math.min(12, totalMonths - currentMonth);

      for (let month = 0; month < monthsInYear; month++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyEMI - interestPayment;
        balance -= principalPayment;

        yearData.principalPaid += principalPayment;
        yearData.interestPaid += interestPayment;
        yearData.totalPayment += monthlyEMI;

        yearData.months.push({
          month: new Date(new Date().getFullYear() + year, month).toLocaleString('default', { month: 'short' }),
          principal: Math.round(principalPayment),
          interest: Math.round(interestPayment),
          total: Math.round(monthlyEMI),
          balance: Math.round(Math.max(0, balance)),
          paidToDate: ((principal - balance) / principal * 100).toFixed(2)
        });

        currentMonth++;
      }

      yearData.principalPaid = Math.round(yearData.principalPaid);
      yearData.interestPaid = Math.round(yearData.interestPaid);
      yearData.totalPayment = Math.round(yearData.totalPayment);
      yearData.balance = Math.round(Math.max(0, balance));
      yearData.loanPaidToDate = ((principal - balance) / principal * 100).toFixed(2);

      breakdown.push(yearData);
    }

    setYearlyBreakdown(breakdown);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const handleLoanAmountChange = (e) => {
    const value = e.target.value.replace(/,/g, '');
    if (!isNaN(value)) {
      setLoanAmount(Math.min(Math.max(parseFloat(value) || 0, minLoanAmount), maxLoanAmount));
    }
  };

  const handleInterestRateChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setInterestRate(Math.min(Math.max(value, minInterestRate), maxInterestRate));
    }
  };

  const handleLoanTermChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setLoanTerm(Math.min(Math.max(value, minLoanTerm), maxLoanTerm));
    }
  };

  const toggleYearExpansion = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // Download as PDF (using browser print)
  const handleDownloadPDF = () => {
    console.log('Download PDF clicked');
    try {
      window.print();
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Unable to open print dialog. Please try again.');
    }
  };

  // Download as Excel (CSV format)
  const handleDownloadExcel = () => {
    console.log('Download Excel clicked');
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Header
      csvContent += "EMI Calculator Report\n\n";
      csvContent += `Loan Amount,₹${formatNumber(loanAmount)}\n`;
      csvContent += `Interest Rate,${interestRate}%\n`;
      csvContent += `Loan Tenure,${loanTerm} ${tenureType}\n`;
      csvContent += `EMI Scheme,${emiScheme === 'advance' ? 'EMI in Advance' : 'EMI in Arrears'}\n\n`;
      
      csvContent += `Monthly EMI,₹${formatNumber(emi)}\n`;
      csvContent += `Total Interest,₹${formatNumber(totalInterest)}\n`;
      csvContent += `Total Payment,₹${formatNumber(totalPayment)}\n\n`;
      
      // Payment Schedule
      csvContent += "Payment Schedule\n";
      csvContent += "Year,Principal Paid,Interest Paid,Total Payment,Balance,Loan Paid %\n";
      
      yearlyBreakdown.forEach(yearData => {
        csvContent += `${yearData.year},₹${formatNumber(yearData.principalPaid)},₹${formatNumber(yearData.interestPaid)},₹${formatNumber(yearData.totalPayment)},₹${formatNumber(yearData.balance)},${yearData.loanPaidToDate}%\n`;
        
        // Add monthly details
        yearData.months.forEach(monthData => {
          csvContent += `  ${monthData.month},₹${formatNumber(monthData.principal)},₹${formatNumber(monthData.interest)},₹${formatNumber(monthData.total)},₹${formatNumber(monthData.balance)},${monthData.paidToDate}%\n`;
        });
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `EMI_Calculator_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Excel download successful');
      alert('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Excel download error:', error);
      alert('Unable to download Excel file. Please try again.');
    }
  };

  // Share functionality (copy link to clipboard)
  const handleShare = async () => {
    console.log('Share clicked');
    try {
      const shareData = {
        loanAmount,
        interestRate,
        loanTerm,
        tenureType,
        emiScheme
      };
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?data=${btoa(JSON.stringify(shareData))}`;
      console.log('Share URL:', shareUrl);
      
      // Try Web Share API first (works on mobile)
      if (navigator.share) {
        console.log('Using Web Share API');
        await navigator.share({
          title: 'EMI Calculator',
          text: `Check out my loan calculation: Monthly EMI ₹${formatNumber(emi)}`,
          url: shareUrl
        });
        console.log('Shared successfully via Web Share API');
      } else {
        // Fallback: Copy to clipboard
        console.log('Using clipboard API');
        await navigator.clipboard.writeText(shareUrl);
        alert('✅ Link copied to clipboard! You can now share it with anyone.');
        console.log('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Share error:', error);
      // Final fallback
      try {
        const shareData = {
          loanAmount,
          interestRate,
          loanTerm,
          tenureType,
          emiScheme
        };
        const shareUrl = `${window.location.origin}${window.location.pathname}?data=${btoa(JSON.stringify(shareData))}`;
        
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ Link copied to clipboard!');
        console.log('Link copied using fallback method');
      } catch (fallbackError) {
        console.error('Fallback share error:', fallbackError);
        alert('❌ Unable to copy link. Please try again.');
      }
    }
  };

  const principalPercentage = totalPayment > 0 ? ((loanAmount / totalPayment) * 100).toFixed(1) : 0;
  const interestPercentage = totalPayment > 0 ? ((totalInterest / totalPayment) * 100).toFixed(1) : 0;

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
            EMI Calculator
          </h1>
          <p className="text-base text-muted-foreground font-medium">
            Calculate your monthly EMI, total interest, and payment schedule
          </p>
        </div>

        {/* Main Calculator Card */}
        <Card className="shadow-2xl border-2 border-border/50">
          <CardContent className="p-6 space-y-6">
            
            {/* Loan Amount */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-bold text-foreground">
                  💰 Loan Amount
                </Label>
                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                  <span className="text-xl font-black text-primary">₹</span>
                  <Input
                    value={formatNumber(loanAmount)}
                    onChange={handleLoanAmountChange}
                    className="w-32 text-right text-lg font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min={minLoanAmount}
                  max={maxLoanAmount}
                  step="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-lg"
                  style={{
                    background: `linear-gradient(to right, #60a5fa ${(loanAmount / maxLoanAmount) * 100}%, #e5e7eb ${(loanAmount / maxLoanAmount) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>₹0</span>
                  <span>₹5L</span>
                  <span>₹10L</span>
                  <span>₹15L</span>
                  <span>₹20L</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50"></div>

            {/* Interest Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-bold text-foreground">
                  📊 Interest Rate
                </Label>
                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                  <Input
                    value={interestRate}
                    onChange={handleInterestRateChange}
                    type="number"
                    step="0.1"
                    className="w-20 text-right text-lg font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                  />
                  <span className="text-xl font-black text-primary">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min={minInterestRate}
                  max={maxInterestRate}
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer shadow-lg"
                  style={{
                    background: `linear-gradient(to right, #34d399 ${((interestRate - minInterestRate) / (maxInterestRate - minInterestRate)) * 100}%, #e5e7eb ${((interestRate - minInterestRate) / (maxInterestRate - minInterestRate)) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50"></div>

            {/* Loan Tenure */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-bold text-foreground">
                  ⏱️ Loan Tenure
                </Label>
                <div className="flex items-center gap-2">
                  <div className="bg-muted px-4 py-2 rounded-lg">
                    <Input
                      value={loanTerm}
                      onChange={handleLoanTermChange}
                      type="number"
                      className="w-16 text-right text-lg font-bold border-0 bg-transparent focus-visible:ring-0 p-0"
                    />
                  </div>
                  <div className="flex rounded-lg overflow-hidden shadow-md">
                    <Button
                      type="button"
                      variant={tenureType === 'years' ? 'default' : 'outline'}
                      onClick={() => setTenureType('years')}
                      className="rounded-none px-4 py-2 text-sm font-bold"
                    >
                      Years
                    </Button>
                    <Button
                      type="button"
                      variant={tenureType === 'months' ? 'default' : 'outline'}
                      onClick={() => setTenureType('months')}
                      className="rounded-none px-4 py-2 text-sm font-bold border-l-0"
                    >
                      Months
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min={minLoanTerm}
                  max={maxLoanTerm}
                  step="1"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer shadow-lg"
                  style={{
                    background: `linear-gradient(to right, #a78bfa ${(loanTerm / maxLoanTerm) * 100}%, #e5e7eb ${(loanTerm / maxLoanTerm) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>7 Yrs</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50"></div>

            {/* EMI Scheme */}
            <div className="space-y-3">
              <Label className="text-lg font-bold text-foreground block">
                🔄 EMI Payment Scheme
              </Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={emiScheme === 'advance' ? 'default' : 'outline'}
                  onClick={() => setEmiScheme('advance')}
                  className="flex-1 py-4 text-sm font-bold"
                >
                  EMI in Advance
                </Button>
                <Button
                  type="button"
                  variant={emiScheme === 'arrears' ? 'default' : 'outline'}
                  onClick={() => setEmiScheme('arrears')}
                  className="flex-1 py-4 text-sm font-bold"
                >
                  EMI in Arrears
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Summary Cards */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-3xl">
                    💳
                  </div>
                  <h3 className="text-lg font-bold text-muted-foreground">Monthly EMI</h3>
                </div>
                <p className="text-5xl font-black text-foreground">₹{formatNumber(emi)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-3xl">
                    📈
                  </div>
                  <h3 className="text-lg font-bold text-muted-foreground">Total Interest</h3>
                </div>
                <p className="text-5xl font-black text-foreground">₹{formatNumber(totalInterest)}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-3xl">
                    💰
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-muted-foreground">Total Payment</h3>
                    <p className="text-sm text-muted-foreground">(Principal + Interest)</p>
                  </div>
                </div>
                <p className="text-5xl font-black text-foreground">₹{formatNumber(totalPayment)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pie Chart */}
          <Card className="shadow-xl border-2 border-border/50">
            <CardContent className="p-8">
              <h3 className="text-center text-2xl font-black mb-6 text-foreground">Payment Breakdown</h3>
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 200 200" className="w-64 h-64">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="40"
                    strokeDasharray={`${principalPercentage * 5.03} 503`}
                    transform="rotate(-90 100 100)"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="40"
                    strokeDasharray={`${interestPercentage * 5.03} 503`}
                    strokeDashoffset={`-${principalPercentage * 5.03}`}
                    transform="rotate(-90 100 100)"
                  />
                  <text x="100" y="95" textAnchor="middle" className="text-2xl font-black fill-green-600">
                    {principalPercentage}%
                  </text>
                  <text x="100" y="120" textAnchor="middle" className="text-2xl font-black fill-orange-600">
                    {interestPercentage}%
                  </text>
                </svg>
                <div className="mt-8 space-y-4 w-full">
                  <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-green-500"></span>
                    <span className="text-base font-bold text-foreground flex-1">Principal Amount</span>
                    <span className="text-lg font-black text-green-600">{principalPercentage}%</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-orange-500/10 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-orange-500"></span>
                    <span className="text-base font-bold text-foreground flex-1">Total Interest</span>
                    <span className="text-lg font-black text-orange-600">{interestPercentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Schedule Table */}
        <Card className="shadow-2xl border-2 border-border/50">
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-foreground mb-2">📅 Payment Schedule</h2>
              <p className="text-base text-muted-foreground font-medium">
                Detailed breakdown starting from {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-4 text-left text-base font-black text-foreground">Year</th>
                    <th className="p-4 text-right text-base font-black text-foreground">Principal</th>
                    <th className="p-4 text-right text-base font-black text-foreground">Interest</th>
                    <th className="p-4 text-right text-base font-black text-foreground hidden sm:table-cell">Total Payment</th>
                    <th className="p-4 text-right text-base font-black text-foreground">Balance</th>
                    <th className="p-4 text-right text-base font-black text-foreground hidden lg:table-cell">Paid %</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyBreakdown.map((yearData, index) => (
                    <React.Fragment key={index}>
                      <tr className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td 
                          className="p-4 cursor-pointer font-black text-primary hover:text-primary/80"
                          onClick={() => toggleYearExpansion(yearData.year)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedYears[yearData.year] ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                            <span className="text-lg">{yearData.year}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right text-base font-semibold text-foreground">₹ {formatNumber(yearData.principalPaid)}</td>
                        <td className="p-4 text-right text-base font-semibold text-foreground">₹ {formatNumber(yearData.interestPaid)}</td>
                        <td className="p-4 text-right text-base font-semibold text-foreground hidden sm:table-cell">₹ {formatNumber(yearData.totalPayment)}</td>
                        <td className="p-4 text-right text-base font-black text-primary">₹ {formatNumber(yearData.balance)}</td>
                        <td className="p-4 text-right text-base font-bold text-muted-foreground hidden lg:table-cell">{yearData.loanPaidToDate}%</td>
                      </tr>
                      {expandedYears[yearData.year] && (
                        <tr>
                          <td colSpan="6" className="p-0">
                            <div className="bg-muted/20 p-6">
                              <table className="w-full">
                                <tbody>
                                  {yearData.months.map((monthData, monthIndex) => (
                                    <tr key={monthIndex} className="border-b border-border/30 last:border-b-0">
                                      <td className="p-3 text-base font-semibold text-muted-foreground w-28">{monthData.month}</td>
                                      <td className="p-3 text-right text-base font-medium text-foreground">₹ {formatNumber(monthData.principal)}</td>
                                      <td className="p-3 text-right text-base font-medium text-foreground">₹ {formatNumber(monthData.interest)}</td>
                                      <td className="p-3 text-right text-base font-medium text-foreground hidden sm:table-cell">₹ {formatNumber(monthData.total)}</td>
                                      <td className="p-3 text-right text-base font-bold text-foreground">₹ {formatNumber(monthData.balance)}</td>
                                      <td className="p-3 text-right text-base text-muted-foreground hidden lg:table-cell">{monthData.paidToDate}%</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Download Section */}
            <div className="mt-10 p-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20">
              <p className="text-center text-lg font-bold text-foreground mb-6">
                💾 Download or share your EMI calculation
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  type="button"
                  onClick={handleDownloadPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base font-bold shadow-lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  type="button"
                  onClick={handleDownloadExcel}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-base font-bold shadow-lg"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  Download Excel
                </Button>
                <Button 
                  type="button"
                  onClick={handleShare}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-bold shadow-lg"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EMICalculator;

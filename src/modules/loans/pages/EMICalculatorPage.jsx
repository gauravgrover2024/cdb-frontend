import React from 'react';
import EMICalculator from '../components/EMICalculator';

const EMICalculatorPage = () => {
  return (
    <div className="w-screen min-h-screen bg-background">
      {/* Main Calculator */}
      <EMICalculator />
      
      {/* Information Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* How to Use Section */}
          <div className="bg-card border-2 border-border/50 rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-2xl">
                📖
              </div>
              <h2 className="text-3xl font-black text-foreground">
                How to Use
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="group hover:bg-muted/50 p-4 rounded-xl transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-black text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-foreground">Select Loan Type</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Choose between Home Loan, Personal Loan, or Car Loan based on your requirement.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group hover:bg-muted/50 p-4 rounded-xl transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-black text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-foreground">Enter Loan Amount</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Input the total loan amount you wish to borrow. You can either type the amount or use the slider.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group hover:bg-muted/50 p-4 rounded-xl transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-black text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-foreground">Set Interest Rate</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Enter the annual interest rate offered by your lender. Typically ranges from 5% to 20%.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group hover:bg-muted/50 p-4 rounded-xl transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-black text-primary">4</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-foreground">Choose Loan Tenure</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      Select the duration for repayment. You can choose between years or months.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group hover:bg-muted/50 p-4 rounded-xl transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-black text-primary">5</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2 text-foreground">Select EMI Scheme</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">EMI in Arrears:</span> Standard scheme (end of month)<br />
                      <span className="font-semibold text-foreground">EMI in Advance:</span> Payment at beginning of month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Understanding EMI Section */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-2xl">
                🧮
              </div>
              <h2 className="text-3xl font-black text-foreground">
                Understanding EMI
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border border-border/50">
                <p className="text-base text-foreground leading-relaxed mb-4">
                  <span className="font-black text-lg">EMI (Equated Monthly Installment)</span> is the fixed amount you pay every month to repay your loan. It consists of both principal and interest components.
                </p>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border border-border/50">
                <h3 className="font-bold text-lg mb-4 text-foreground">📐 EMI Formula</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <code className="text-base font-mono font-bold text-primary block text-center">
                    EMI = [P × R × (1+R)^N] / [(1+R)^N-1]
                  </code>
                </div>
                <div className="space-y-2 text-base text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-foreground min-w-[20px]">P</span>
                    <span>=</span>
                    <span>Principal loan amount</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-foreground min-w-[20px]">R</span>
                    <span>=</span>
                    <span>Monthly interest rate (Annual Rate / 12 / 100)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-foreground min-w-[20px]">N</span>
                    <span>=</span>
                    <span>Loan tenure in months</span>
                  </p>
                </div>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-xl border border-border/50">
                <h3 className="font-bold text-lg mb-3 text-foreground">💡 Key Benefits</h3>
                <ul className="space-y-3 text-base text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Fixed monthly payments for better budgeting</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Clear visibility of total interest payable</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Detailed payment schedule for planning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <span>Compare different loan scenarios easily</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EMICalculatorPage;

import React from 'react';
import { Chrome, Download, ShieldCheck, Zap } from 'lucide-react';

export default function ExtensionConnectCard() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-5 px-4 relative overflow-hidden group">
      
      {/* Background styling for premium look */}
      <div className="absolute inset-0 bg-gradient-to-br from-[primary]/5 via-transparent to-[brand-lime]/10 z-0 transition-opacity duration-500 group-hover:opacity-80"></div>
      
      {/* Decorative blobs */}
      <div className="absolute -top-12 -right-12 size-32 bg-brand-lime/30 rounded-full blur-3xl z-0 transition-transform duration-700 group-hover:scale-110"></div>
      <div className="absolute -bottom-12 -left-12 size-32 bg-primary/10 rounded-full blur-3xl z-0 transition-transform duration-700 group-hover:scale-110"></div>

      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="relative mb-5 mt-2">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-[primary] to-[brand-lime] rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative size-14 bg-background rounded-full flex items-center justify-center border border-border shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:border-transparent">
            <Chrome className="size-7 text-primary" />
            <div className="absolute -bottom-1.5 -right-1.5 bg-brand-lime rounded-full p-1 border-2 border-white shadow-sm">
              <ShieldCheck className="size-3.5 text-foreground" />
            </div>
          </div>
        </div>
        
        <h3 className="font-display text-base font-bold text-foreground mb-2 tracking-tight">Real-time Protection</h3>
        <p className="text-xs text-foreground/60 mb-6 max-w-[210px] leading-relaxed">
          Get instant alerts on malicious links and phishing attempts directly in your browser.
        </p>
        
        <a 
          href="#"
          className="relative inline-flex items-center justify-center gap-2 bg-primary hover:bg-foreground text-primary-foreground text-[13px] font-bold py-2.5 px-6 w-[80%] rounded-full transition-all duration-300 shadow-[0_4px_14px_0_rgba(4,4,247,0.25)] hover:shadow-[0_6px_20px_rgba(17,19,28,0.23)] hover:-translate-y-0.5 overflow-hidden group/btn"
        >
          <div className="absolute inset-0 bg-card/20 translate-y-[100%] group-hover/btn:translate-y-[0%] transition-transform duration-300"></div>
          <Download className="size-4 relative z-10" />
          <span className="relative z-10">Add to Chrome</span>
        </a>
      </div>
    </div>
  );
}

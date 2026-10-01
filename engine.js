// Sudoku engine: solver, unique-puzzle generator, seeded random (for the daily puzzle)
(function(root){
  const BOX=Array.from({length:81},(_,i)=>((i/27|0)*3)+((i%9)/3|0));
  const pc=m=>{let c=0;while(m){m&=m-1;c++}return c};
  const CLUES={easy:40,medium:34,hard:29,expert:25};

  function rng(seed){
    return function(){
      seed|=0;seed=seed+0x6D2B79F5|0;
      let t=Math.imul(seed^seed>>>15,1|seed);
      t=t+Math.imul(t^t>>>7,61|t)^t;
      return((t^t>>>14)>>>0)/4294967296;
    };
  }
  function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  // counts solutions up to `limit`; with `r` the digit order is random (used to build a full grid)
  function solveCount(grid,limit,r){
    const g=Int8Array.from(grid),rw=new Int16Array(9),cl=new Int16Array(9),bx=new Int16Array(9);
    for(let i=0;i<81;i++){const v=g[i];if(v){const b=1<<v;rw[i/9|0]|=b;cl[i%9]|=b;bx[BOX[i]]|=b}}
    let n=0,sol=null;
    const rec=()=>{
      let bi=-1,bm=0,bn=10;
      for(let i=0;i<81;i++){
        if(g[i])continue;
        const m=~(rw[i/9|0]|cl[i%9]|bx[BOX[i]])&0x3FE,c=pc(m);
        if(c<bn){bn=c;bi=i;bm=m;if(c<2)break}
      }
      if(bi<0){n++;if(!sol)sol=Array.from(g);return n>=limit}
      if(!bn)return false;
      const vals=[];for(let v=1;v<=9;v++)if(bm&(1<<v))vals.push(v);
      if(r)shuffle(vals,r);
      const ri=bi/9|0,ci=bi%9,bo=BOX[bi];
      for(const v of vals){
        const b=1<<v;g[bi]=v;rw[ri]|=b;cl[ci]|=b;bx[bo]|=b;
        if(rec())return true;
        g[bi]=0;rw[ri]^=b;cl[ci]^=b;bx[bo]^=b;
      }
      return false;
    };
    rec();return{n,sol};
  }

  function generate(diff,r){
    r=r||Math.random;
    const sol=solveCount(new Int8Array(81),1,r).sol,puz=sol.slice();
    const order=shuffle(Array.from({length:81},(_,i)=>i),r),target=CLUES[diff]||34;
    let clues=81;
    for(const i of order){
      if(clues<=target)break;
      const v=puz[i];puz[i]=0;
      if(solveCount(puz,2).n!==1)puz[i]=v;else clues--;
    }
    return{puz,sol};
  }
  const api={rng,generate,solveCount,CLUES};
  root.SudokuEngine=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

2. Learned fusion at inference: “mixture of experts”
Instead of picking one model as teacher, you can have a fusion network that learns how to combine their outputs.
2.1 Simple version (almost no extra model)
At test time per pixel:
Let logits be 
z
A
z 
A
​	
  (DINO) and 
z
B
z 
B
​	
  (SAM3).
Define a heuristic weight:
w
=
σ
(
α
(
∣
z
A
∣
−
∣
z
B
∣
)
)
w=σ(α(∣z 
A
​	
 ∣−∣z 
B
​	
 ∣))
(so higher conf gets higher weight)
Final logit:
z
fused
=
w
z
A
+
(
1
−
w
)
z
B
z 
fused
​	
 =wz 
A
​	
 +(1−w)z 
B
​	
 
Then run your usual graph-cut refinement on 
z
fused
z 
fused
​	
 .
This already uses both models:
When DINO is more confident → more weight.
When SAM3 is more confident → more weight.
Where both are unsure → output stays conservative and topology loss / post-processing shape things.
2.2 Slightly more advanced: a tiny gating CNN
If you can afford a small labeled subset (even 50–100 hand-labeled images):
Train a gating network 
g
(
x
)
g(x) that outputs per-pixel weights 
w
(
x
)
∈
[
0
,
1
]
w(x)∈[0,1] telling “how much to trust DINO vs SAM3”.
Inputs to gate:
the image,
both models’ logits or masks,
optional thickness / texture features.
Loss: supervised on your small GT set to minimize segmentation error.
At inference:
z
final
=
w
(
x
)
 
z
A
+
(
1
−
w
(
x
)
)
 
z
B
z 
final
​	
 =w(x)z 
A
​	
 +(1−w(x))z 
B
​	
 
This way:
You don’t assume one model is universally better.
The gate learns where each model shines (e.g., SAM3 better on thin bright cracks, DINO better on noisy concrete, etc.).


3. Mutual distillation (co-training), not one-way teaching
If you like the “self-supervised” flavor, you can make them teach each other on unlabeled data:
For each unlabeled image:
Run both models to get logits 
z
A
,
z
B
z 
A
​	
 ,z 
B
​	
 .
Keep only high-confidence pixels for each model separately.
Use a symmetrized distillation loss:
L
mutual
=
KL
(
σ
(
z
A
)
 
∥
 
σ
(
z
B
)
)
 on high-conf of A
+
KL
(
σ
(
z
B
)
 
∥
 
σ
(
z
A
)
)
 on high-conf of B
L 
mutual
​	
 =KL(σ(z 
A
​	
 )∥σ(z 
B
​	
 )) on high-conf of A+KL(σ(z 
B
​	
 )∥σ(z 
A
​	
 )) on high-conf of B
Interpretation:
Where DINO is very sure, SAM3 is nudged toward DINO.
Where SAM3 is very sure, DINO is nudged toward SAM3.
Where neither is sure, no distillation.
On top of this, you can still add:
crack-structure losses on each,
consistency across augmentations / temporal neighbors.
Now both models slowly move toward a shared “consensus” solution, each pulling the other in the regions where it is strong.


3. Mutual distillation (co-training), not one-way teaching
If you like the “self-supervised” flavor, you can make them teach each other on unlabeled data:
For each unlabeled image:
Run both models to get logits 
z
A
,
z
B
z 
A
​	
 ,z 
B
​	
 .
Keep only high-confidence pixels for each model separately.
Use a symmetrized distillation loss:
L
mutual
=
KL
(
σ
(
z
A
)
 
∥
 
σ
(
z
B
)
)
 on high-conf of A
+
KL
(
σ
(
z
B
)
 
∥
 
σ
(
z
A
)
)
 on high-conf of B
L 
mutual
​	
 =KL(σ(z 
A
​	
 )∥σ(z 
B
​	
 )) on high-conf of A+KL(σ(z 
B
​	
 )∥σ(z 
A
​	
 )) on high-conf of B
Interpretation:
Where DINO is very sure, SAM3 is nudged toward DINO.
Where SAM3 is very sure, DINO is nudged toward SAM3.
Where neither is sure, no distillation.
On top of this, you can still add:
crack-structure losses on each,
consistency across augmentations / temporal neighbors.
Now both models slowly move toward a shared “consensus” solution, each pulling the other in the regions where it is strong.
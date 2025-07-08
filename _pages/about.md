---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

<!-- - I am currently a third-year Master's Student at the School of Data Science and Engineering, East China Normal University, under the supervision of Prof. Ming Gao and [Prof. Xiang Li](https://lixiang3776.github.io/) in the X101 lab. I am also a research intern at Shanghai AI Lab, supervised by [Dr. Wenhai Wang](https://whai362.github.io/) and [Dr. Zhiyong Wu](https://lividwo.github.io/zywu.github.io/).-->

I am currently a Research Engineer in [OpenGVLab](https://github.com/opengvlab), Shanghai AI Laboratory, collaborating with [Dr. Wenhai Wang](https://whai362.github.io/) and [Dr. Weijie Su](https://www.weijiesu.com/). Before that, I received my M.Eng. degree from the [School of Data Science and Engineering](https://dase.ecnu.edu.cn/), [East China Normal University](https://www.ecnu.edu.cn/) in 2025, advised by Prof. Ming Gao and [Prof. Xiang Li](https://lixiang3776.github.io/) in X101 lab, and B.Eng. degree at the [School of Software](https://ss.dlut.edu.cn/), [Dalian University of Technology](https://www.dlut.edu.cn/) in 2022, respectively.

My research interests include:
- **AI Agents:** [OS-Copilot](https://arxiv.org/pdf/2402.07456)(LLMAgents@ICLR'24), [OS-Atlas](https://arxiv.org/abs/2410.23218)(ICLR’25 *Spotlight*), [OS-Genesis](https://arxiv.org/abs/2412.19723)(ACL’25), [GUIMid](https://arxiv.org/pdf/2504.10127)(COLM'25);
- **Scientific Research:** [SEA](https://arxiv.org/abs/2407.12857)(EMNLP'24), [SEAGraph](https://arxiv.org/pdf/2412.11939), [ScienceBoard](https://arxiv.org/abs/2505.19897);
- **Prompt Tuning:** [RELIEF](https://arxiv.org/abs/2408.03195)(SIGKDD'25), [LBS3](https://arxiv.org/pdf/2410.21728)(ACL'25).

★★★ Feel free to reach out to me for academic discussions and collaborations!

# 🔥 News
<style>  
    .scrollable-area {  
        max-height: 180px;  
        overflow-y: auto;  
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);  
        padding: 10px;  
    }
    .pdf {
        text-decoration: none;
        color: #122c8b;
    }
    .code {
        text-decoration: none;
        color: #122c8b;
    }
    .title{
        color: #374798;
    }
</style>  
<div class="scrollable-area">  
    <ul>
        <li><em>2025.07</em>: 🥂🥂 Our paper <a href="https://arxiv.org/pdf/2504.10127">GUIMid</a> is accepted to COLM 2025! 🇨🇦</li>
        <li><em>2025.05</em>: 🔬🧪 We release <a href="https://qiushisun.github.io/ScienceBoard-Home/">ScienceBoard</a> to advance computer-using agents in scientific workflows!</li>
        <li><em>2025.05</em>: 🥂🥂 Our paper <a href="https://arxiv.org/abs/2412.19723">OS-Genesis</a> and <a href="https://arxiv.org/pdf/2410.21728">LBS3</a> are accepted to ACL 2025! 🇦🇹</li>
        <li><em>2025.04</em>: 🤖🤖 We release <a href="https://github.com/hkust-nlp/GUIMid">GUIMid</a>, A new paradigm for training GUI agents!</li>
        <li><em>2025.03</em>: 🏖️🏖️ Will attend ICLR 2025! See you at Singapore! 🇸🇬</li>
        <li><em>2025.01</em>: 🥂🥂 Our paper <a href="https://arxiv.org/pdf/2410.23218">OS-Atlas</a> is accepted to ICLR 2025 (Spotlight)! 🇸🇬</li>
        <li><em>2024.12</em>: 🤖🤖 We release <a href="https://qiushisun.github.io/OS-Genesis-Home/">OS-Genesis</a> and <a href="https://osatlas.github.io/">OS-Atlas</a> to advance GUI agents!</li>
        <li><em>2024.12</em>: 🎉🎉 New homepage!</li>
        <li><em>2024.11</em>: 🥂🥂 Our paper <a href="https://arxiv.org/pdf/2408.03195">RELIEF</a> is accepted to KDD 2025! 🇨🇦</li>
        <li><em>2024.11</em>: ⛱️⛱️ Attend EMNLP 2024 in Miami, USA! 🇺🇸</li>
    </ul>  
</div>  

<!-- # 🔥 News -->
<!-- - *2022.02*: &nbsp;🎉🎉 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet. 
- *2022.02*: &nbsp;🎉🎉 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet.  -->


<!-- - *2024.12:* 🎉 🎉 New homepage!
- *2024.11:* 🥂🥂 Our paper [RELIEF](https://arxiv.org/pdf/2408.03195) is accepted to KDD 2025! 🇨🇦
- *2024.11:* ⛱️⛱️ Attend EMNLP 2024 in Miami, USA! 🇺🇸 -->

<span class='anchor' id='publications'></span>

{% include_relative includes/pub.md %}

# 📖 Educations
- *2022.09 - 2025.06*, Master's, DASE, East China Normal University (via recommendation) <img src='./images/logos/dase_log1.png' style='width: 5em;'>
- *2018.09 - 2022.06*, Undergraduate, School of Software Engineering, Dalian University of Technology <img src='./images/logos/dlut.png' style='width: 5.5em;'>

# 💻 Internships
- *2025.02 - 2025.06*, Research Intern, InternVL Group, Shanghai AI Laboratory <img src='./images/logos/shailab-logo.svg' style='width: 1.90em;'>, Shanghai, China.
- *2023.11 - 2025.01*, Research Intern, NLP Group, Shanghai AI Laboratory <img src='./images/logos/shailab-logo.svg' style='width: 1.90em;'>, Shanghai, China.

# 🏆 Honors and Awards
**Honors**
- *2025.04* &emsp; Outstanding Graduate, East China Normal University
- *2022.06* &emsp; Outstanding Graduate, Dalian University of Technology
- *2018-21* &emsp; Outstanding Student, Dalian University of Technology

**Competition Awards**
- *2021.01* &emsp; **First Place**, IBM Modern Architecture Technology Elite Contest China Division
- *2021.01* &emsp; **Fifth Place**, Microsoft Imagine Cup China Division
- *2021.06* &emsp; **First Prize** in the National MathorCup College Mathematical Modeling Challenge
- *2021.07* &emsp; **Second Prize** in the National China Collegiate Computer Design Contest
- *2021.03* &emsp; **Bronze Medal** in the 2nd National College Algorithm Design and Programming Challenge

# 🎖 Scholarships
- *2022-25* &emsp; Graduate Academic Scholarship, East China Normal University
- *2018-22* &emsp; Academic Excellence Scholarship, Dalian University of Technology
- *2019-21* &emsp; Science and Technology Innovation Scholarship, Dalian University of Technology
- *2021.11* &emsp; Panasonic Scholarship, Dalian University of Technology

<!-- # 💬 Invited Talks
- *2021.06*, Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet. 
- *2021.03*, Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet.  \| [\[video\]](https://github.com/) -->

<!--# 🔍 Services
- I serve(d) as a reviewer / program committee member for the following conferences, journals:
  - Conferences: EMNLP'23, ACL'23, CIKM'23, EMNLP'23 <span style="color:#ac530f">(Best Reviewer Award)</span>, ICLR'24, NeurIPS'24, NLPCC'24, ICLR'25, COLING'25, NAACL'25, SIGKDD'25, COLM'25.
  - Journals: ACL Rolling Review (2023.4 - Present), Frontiers of Computer Science-->


<!--<div style="width: 200px; height: 200px; overflow: hidden;">
    <script type="text/javascript" id="clstr_globe" 
        src="//clustrmaps.com/globe.js?d=C73LXGj9hHgRHh1tddEIc_z3OH7DwCLi_0X65fA9TeQ"></script>
</div> -->
<div style="width: 200px; height: 200px; overflow: hidden; display: block; margin: 30px auto;">
    <script type="text/javascript" id="clstr_globe" 
        src="//clustrmaps.com/globe.js?d=C73LXGj9hHgRHh1tddEIc_z3OH7DwCLi_0X65fA9TeQ"></script>
</div>


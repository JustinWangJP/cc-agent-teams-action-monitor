---
name: teamworks
description: "Agent Teamsを使った実装に入る前に、必ずこれを実行してください。実装を始める前に、必要なteammateを含む一つのチームをどのような体制を構成するかを深く検討してください。"
---

# Agent Teamsを用いたチーム体制の構成定義

## Overview

Agent Teamsを立ち上げるためには、現在カレントプロジェクトの内容を十分に分析して理解し、与えられたタスクを基にプロダクトオーナーの観点から目標を完遂するためにどのチーム（複数チーム可）に依頼すれば、**高品質**、**最適コスト**、**ユーザー満足度最高** プロダクトのビルドできるかよく考えてください。

依頼予定チーム（複数チーム可）のLeaderを最低で１名採用し、アサイン予定の具体タスクとタスク量を基にどのようなロールのチームメンバーが必要となるか、各ロールのチームメンバーは何名が必要となるかよく考えてからAgent Teamsを立ち上げてください。

<HARD-GATE>
チーム構成を提示し、ユーザーに承認されるまでは、実装スキルを駆使したり、コードを書いたり、プロジェクトのスキャフォールディングを行ったり、実装作業を行ったりしないでください。これは、見た目のシンプルさに関わらず、すべてのプロジェクトに当てはまります。
</HARD-GATE>

## アンチパターン：「これは単純すぎるので適当にチーム構成した」

すべてのプロジェクトはこのプロセスを経ます。ToDoリスト、単機能ユーティリティ実装、設定変更など、どれもそうです。「シンプルな」プロジェクトでは、**高品質**、**最適コスト**、**ユーザー満足度最高** プロダクトビルドの目標を考えていないことや、チームへの依頼タスクが不明確、各依頼チームではチームLeaderを含めない体制、各チームにアサインしたチームメンバーのロール不適切や保有したスキルが不適切などが最も無駄な作業を生み出します。Agent Teamsを用いたチーム体制は短くても構いません（本当にシンプルなプロジェクトなら数文程度）。しかし、必ず提示し、承認を得る必要があります。

## チーム紹介

YOU MUST 割り当てられたタスクを完了するには、1 つまたは複数のチームを選択する必要です。

1. **Product Design Section** 
   - チーム役割と目標：**ユーザー満足度最高**のプロダクトを設計し、システムの運用手法を含めてデザインする。開発チームに依頼した開発の設計物に対してUATを行い、開発したプロダクトのフィードバックを開発チームへ連携する。Product Ownerはこのチームに所属する。
   - Section Leader：Product Owner

2. **Product Build Section** 
　　— チーム役割と目標：与えられたビジネス要件、システム要件に基づき、プロダクト実装を行う重要の役割している。実装したプロダクトは自チーム内に評価し、自チーム内で完成を認めたら、Product Design SectionへUATの受け入れを行う。また、Product Design SectionがUATを実施する際に、必要のメンバーで体制を整え、Product Design Sectionからの指摘事項を真摯に受け取り、全力で完成するように対応する。このチームの目標は**高品質**、**最適コスト**のプロダクトを創造する。
   - Section Leader：Develop Leader

## メンバープロフィール

各チームの格メンバープロフィールは以下になる。役割、コミニュケーションルール、保有しているskills、mcp server、toolsなどを定義している。

### **Product Design Section** 
1. Product Owner（１名在籍）
   - 役割：Product Design Sectionの全体リードです。Product Design Sectionチームメンバーへ具体の指示を下さる。チーム役割と目標を念頭に常に考える。わからない内容があったら、ユーザーへ問い合わせする。
   - コミュニケーションルール：もしProduct Build Sectionは協力チームとして存在する場合に、`Develop Leader`のみと会話です。Product Build Sectionのチームメンバーへ直接の指示を行うのは厳禁です。
2. E2E Member（3名在籍）
   - 役割：Product OwnerからアサインされたE2Eテストタスクを受け取り、タスクを高品質的・高効率的に推進する。
   - コミュニケーションルール：`Product Owner`のみと会話し、報告する。他のチームメンバーへ直接の指示を行うのは厳禁です。
   - mcpServers: 
      - zai-mcp-server
      - chrome-devtools

### **Product Build Section** 
1. Develop Leader（１名在籍）
   - 役割：Product Build Sectionの全体リードです。Product Build Sectionチームメンバーへ具体の指示を下さる。チーム役割と目標を念頭に常に考える。Product Ownerからの指摘事項を真摯に受け取り、全力で完成するように対応する。チームメンバーからの開発課題などよく理解し、適切の意見をチームメンバーへフィードバックする。わからない内容がありましたら、mcp serverを介して検索し、よくまとめた内容をチームメンバーへ連携する。
   - コミュニケーションルール：もしProduct Design Sectionは協力チームとして存在する場合に、`Product Owner`のみと会話です。Product Design Sectionのチームメンバーへ直接の指示を行うのは厳禁です。

2. Frontend Developer（3名在籍）
   - 役割：UI/UX画面デザインや、React、tailwind等フレームワークに精通する開発者です。Develop Leaderからアサインされたフロントエンド開発タスクを受け取り、タスクを高品質的・高効率的に開発する。複数名開発メンバーが存在する場合に、同一ファイアルに対して複数名開発者の共同開発が厳禁です。
   - コミュニケーションルール：`Develop Leader`のみと会話し、報告する。他のチームメンバーへ直接の指示を行うのは厳禁です。他のチームメンバーへ伝達事項ありましたら、必ず`Develop Leader`を介して連携する。
   - skills:
      - tailwind-design-system
      - ui-ux-pro-max
      - vercel-react-best-practices
      - error-handling-patterns
      - chrome-devtools
   - mcpServers:
      - perplexity
      - context7
      - github
      - zai-mcp-server
      - chrome-devtools

3. Backend Developer（3名在籍）
   - 役割：Python、Java、データベースデザインなどバックエンド開発スキルを持つスペシャリストです。Develop Leaderからアサインされたバックエンド開発タスクを受け取り、タスクを高品質的・高効率的に開発する。複数名開発メンバーが存在する場合に、同一ファイアルに対して複数名開発者の共同開発が厳禁です。
   - コミュニケーションルール：`Develop Leader`のみと会話し、報告する。他のチームメンバーへ直接の指示を行うのは厳禁です。他のチームメンバーへ伝達事項ありましたら、必ず`Develop Leader`を介して連携する。
   - skills:
      - fastapi-templates
      - microsoft-agent-framework
      - error-handling-patterns
   - mcpServers:
      - perplexity
      - context7  

4. System Architect（1名在籍）
   - 役割：システムアーキテクチャデザインに精通するアーキテクトです。Develop Leaderからアサインされたタスクを受け取り、タスクを高品質的・高効率的に開発する。具体のコード開発を行いませんが、システムデザインを専門し、適切なシステム設計をチームへ共有する。活躍時に必ず`architect`roleへ切り替えてください。
   - コミュニケーションルール：`Develop Leader`のみと会話し、報告する。他のチームメンバーへ直接の指示を行うのは厳禁です。他のチームメンバーへ伝達事項ありましたら、必ず`Develop Leader`を介して連携する。
   - skills:
      - fastapi-templates
      - microsoft-agent-framework
      - tailwind-design-system
      - ui-ux-pro-max
      - vercel-react-best-practices
      - error-handling-patterns
   - mcpServers:
      - perplexity
      - context7  

## Key Principles

- **体制具体化** - どのチーム、どのメンバーが必要となるか、各要員がrole、skills、mcp server、toolsを利用するか、明確する
- **体制理由説明** - Agent Teamの体制はどういった考えの元に体制を組んでいたか理由を説明する。
- **YAGNIを徹底** - 不要なチームまたはメンバーを排除する
- **各チームの１名リードルール** - 選定されたチームは必ず**チーム紹介**の**Section Leader**を体制にアサインする。
- **コミュニケーションルール厳守** - チーム間のコミュニケーションは必ず各チームのリード間で行う。チームメンバーへのタスク指示は必ずまた、コミュニケーションネットワークを作成してください。
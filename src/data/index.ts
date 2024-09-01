export const navbar = {
  logo: "/assets/imgs/logo.png",
  navitems: [
    {
      title: "Platform",
      children: [
        {
          title: "item 1",
          link: "/",
        },
        {
          title: "item 2",
          link: "/",
        },
        {
          title: "item 3",
          link: "/",
        },
      ],
    },
    {
      title: "Documentation",
      children: [
        {
          title: "item 4",
          link: "/",
        },
        {
          title: "item 5",
          link: "/",
        },
        {
          title: "item 6",
          link: "/",
        },
      ],
    },
    {
      title: "Company",
      children: [
        {
          title: "item 10",
          link: "/",
        },
        {
          title: "item 11",
          link: "/",
        },
        {
          title: "item 12",
          link: "/",
        },
      ],
    },
    {
      title: "Blog",
      link: "/",
    },
  ],
};
export const heroData = {
  title:
    "ADHAR Internal Developer Platform, The Open Foundation for Your Business!",
  description:
    "Elevate your team's efficiency with Adhar open-source platform. From ideation to deployment, Adhar streamlines your cloud-native journey, enabling you to define, design, develop, deliver, and discover business applications and services effortlessly.",
  firstbutton: { text: "Try Adhar Cloud", link: "/" },
  secondbutton: { text: "Learn More", link: "/docs" },
  heroImage: "/assets/imgs/hero-img.png",
};
export const subscriptionData = {
  image: "/assets/imgs/subscription.svg",
  title: "Avoid the hassle of setup, try Adhar Cloud!",
  description:
    "Explore Adhar platform with a free forever plan, and upgrade to a paid plan whenever you're ready.",
  button: { text: "View Pricing" },
};
export const howWorksData = {
  pretitle: "How Adhar Works?",
  title: "A Structured Approach from Define to Discover",
  description:
    "Experience a comprehensive software development life cycle with the Adhar platform, covering everything from requirement gathering to deployment and beyond.",

  tabsData: [
    {
      id: 1,
      title: "🎯 Define",
      list: [
        {
          title: "Requirement Gathering",
          description:
            "Start by understanding business needs and project goals. Through in-depth discussions and analysis, gather all necessary requirements to ensure a clear understanding of the objectives.",
        },
        {
          title: "Research",
          description:
            "Next, conduct thorough research on industry, target audience, and competitors. This helps identify trends and opportunities to better align with business goals.",
        },
        {
          title: "Define User-Stories",
          description:
            "Based on analysis and research, define the scope of the project, outlining deliverables, timelines, and resources required to meet your expectations.",
        },
      ],
      image: "/assets/illustrations/requirements.svg",
      button: { text: "Learn More", link: "/define" },
    },
    {
      id: 2,
      title: "💅 Design",
      list: [
        {
          title: "Architecture Design",
          description:
            "Architecture design focuses on building scalable, resilient, and flexible systems that leverage microservices, containerization, and orchestration to optimize performance and resource utilization.",
        },
        {
          title: "UX/UI Design",
          description:
            "Design team crafts intuitive and engaging user experiences, focusing on usability and aesthetics to enhance user satisfaction and customer retention.",
        },
        {
          title: "Prototyping",
          description:
            "Develop prototypes to visualize the design and gather feedback, allowing for iterative improvements before finalizing the design and spending time on development.",
        },
      ],
      image: "/assets/illustrations/sketch.svg",
      button: { text: "Learn More", link: "/design" },
    },
    {
      id: 3,
      title: "👨‍💻 Develop",
      list: [
        {
          title: "Application & Services Development",
          description:
            "Application and services development involves creating robust, scalable, and user-friendly software solutions that meet specific business needs and enhance overall operational efficiency.",
        },
        {
          title: "Integration",
          description:
            "Integrating various systems and services through APIs is crucial for ensuring seamless data exchange, enhancing application capabilities, and enabling efficient and scalable business operations.",
        },
        {
          title: "Testing",
          description:
            "Rigorous testing is conducted to identify and fix any issues, ensuring different aspects of the application's functionality, performance, and reliability.",
        },
      ],
      image: "/assets/illustrations/develop.svg",
      button: { text: "Learn More", link: "/develop" },
    },
    {
      id: 4,
      title: "🚀  Deliver",
      list: [
        {
          title: "Deployment",
          description:
            "Delivering new features and updates to users, ensuring they have access to the latest improvements and functionalities seamlessly.",
        },
        {
          title: "Resiliency",
          description:
            "Ability to recover quickly from failures and continue operating effectively, ensuring minimal disruption to users and maintaining service availability.",
        },
        {
          title: "Support",
          description:
            "Post deployment support is available to address any issues and ensure the application continues to perform optimally.",
        },
      ],
      image: "/assets/illustrations/delivery.svg",
      button: { text: "Learn More", link: "/deliver" },
    },
    {
      id: 5,
      title: "✨ Discover",
      list: [
        {
          title: "Analytics",
          description:
            "We provide tools and insights to help you retrieve and analyze key metrics, enabling you to make informed business decisions.",
        },
        {
          title: "Monitoring",
          description:
            "Continuous monitoring of the application's performance helps identify areas for improvement and ensures ongoing optimization.",
        },
        {
          title: "Business Insights",
          description:
            "Leverage data-driven insights to enhance your business strategies and drive growth, ensuring your application evolves with your needs.",
        },
      ],
      image: "/assets/illustrations/monitor.svg",
      button: { text: "Learn More", link: "/discover" },
    },
  ],
};
export const AdharSolutionData = {
  title: "Adhar: The All-in-One Platform",
  description:
    "Adhar streamlines software Development and Operations through full automation, enabling enterprises to effortlessly create robust Internal Developer Platform that ensures developer efficiency and better governance.",
  cards: [
    {
      icon: "/assets/icons/open-source.svg",
      title: "Open Source",
      description:
        "By integrating the finest open-source tools and platforms, Adhar is meticulously crafted to be the best enterprise platform. This commitment to openness ensures transparency, fosters continuous innovation, and empowers modern enterprises to achieve greater efficiency and agility.",
    },
    {
      icon: "/assets/icons/rich-features.svg",
      title: "Multi Cloud",
      description:
        "Multi-cloud and Hybrid cloud strategies are essential for modern businesses to achieve greater flexibility, resilience, and cost efficiency. By leveraging multiple cloud providers, enterprises can avoid vendor lock-in, optimize performance, and ensure high availability.",
    },
    {
      icon: "/assets/icons/easy-to-run.svg",
      title: "Kubernetes Native",
      description:
        "The Adhar platform extends Kubernetes by addressing its gaps, transforming it into a comprehensive enterprise solution that accelerates the delivery of robust applications and services, ensuring efficiency and scalability for modern businesses.",
    },
    {
      icon: "/assets/icons/modular-pluggable.svg",
      title: "Modular & Pluggable",
      description:
        "Adhar boasts a modular, plug-and-play architecture, ensuring flexibility and extensibility for seamless integration. This design fosters innovation and supports adaptability, allowing enterprises to adapt quickly to evolving technologies and business needs.",
    },
  ],
};
export const KubernetesDeploymentData = {
  title: "Simplifying Kubernetes Adoption",
  description:
    "Adhar fosters seamless collaboration through its multi-tenant Kubernetes platform, enabling diverse teams to work together efficiently, thereby providing greater control and adaptability. Experts gain full control, developers experience reduced cognitive load, and businesses become more engaged in the process.",

  tabsData: [
    {
      id: 1,
      title: "Infra Team",
      icon: "/assets/icons/infra-team.svg",
      description:
        "Automated installation, scaling, and upgrades from cloud to data center",

      list: [
        "Improve your resource utilization and reduce internal infrastructure costs",
        "Provide security enhancements, and support multiple storage and network solutions",
        "Deliver a trustworthy and certified Kubernetes platform and distribution",
        "Support multi-cloud and multi-cluster Kubernetes management, avoiding vendor lock-in (coming soon)",
      ],
    },
    {
      id: 2,
      title: "Developers",
      icon: "/assets/icons/infra-team.svg",
      description:
        "Automated installation, scaling, and upgrades from cloud to data center",

      list: [
        "Improve your resource utilization and reduce internal infrastructure costs",
        "Provide security enhancements, and support multiple storage and network solutions",
        "Deliver a trustworthy and certified Kubernetes platform and distribution",
        "Support multi-cloud and multi-cluster Kubernetes management, avoiding vendor lock-in (coming soon)",
      ],
    },
    {
      id: 3,
      title: "Ops Team",
      icon: "/assets/icons/infra-team.svg",
      description:
        "Automated installation, scaling, and upgrades from cloud to data center",

      list: [
        "Improve your resource utilization and reduce internal infrastructure costs",
        "Provide security enhancements, and support multiple storage and network solutions",
        "Deliver a trustworthy and certified Kubernetes platform and distribution",
        "Support multi-cloud and multi-cluster Kubernetes management, avoiding vendor lock-in (coming soon)",
      ],
    },
    {
      id: 4,
      title: "End User",
      icon: "/assets/icons/infra-team.svg",
      description:
        "Automated installation, scaling, and upgrades from cloud to data center",
      list: [
        "Improve your resource utilization and reduce internal infrastructure costs",
        "Provide security enhancements, and support multiple storage and network solutions",
        "Deliver a trustworthy and certified Kubernetes platform and distribution",
        "Support multi-cloud and multi-cluster Kubernetes management, avoiding vendor lock-in (coming soon)",
      ],
    },
  ],
};
export const featuresData = {
  title: "Unlocking the Potential of Cloud-Native Development with Adhar Platform",
  description: "Empower Your Development Journey with Adhar's Comprehensive Suite of Integrated Tools and Seamless Scalability",
  pretitle: "ADHAR CAPABILITIES",
  button: {
    title: "Learn More",
    link: "/",
  },
  featureList: [
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Multiple Language and Framework Support",
      description: "Adhar supports a wide range of languages and frameworks, including Angular, SpringBoot, Quarkus, Go, Java, JavaScript, Python, NodeJS, React, and TypeScript.",
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Great Developer Experience",
      description: "Adhar offers an exceptional developer experience right out of the box, by implementing fast feedback-loop and self service capabilities which allows developers to focus on building innovative solutions.",
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Cloud-Native Architecture",
      description: `Adhar is designed for the cloud, with support for containerized applications, automated deployments, and managed services.`,
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Open-Source Platform",
      description: `Adhar is an open-source platform that provides a set of integrated tools for building, deploying, and managing cloud-native applications.`,
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Pre-Built Enterprise Capabilities",
      description: `Adhar platform is designed to scale with your application. It can handle increased load by automatically adding resources when they are needed.`,
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Security, Compliance & Governance", 
      description: `Adhar platform provides robust security features, including automatic updates, secure service credentials, and isolation policies to protect your applications.`,
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Continuous Integration/Deployment",
      description: `Adhar platform supports CI/CD, allowing you to automate your development process, from code commit to production deployment.`,
    },
    {
      icon: "/assets/icons/framework 1.svg",
      title: "Monitoring and Observability",
      description: `Adhar platform provides monitoring and analytics tools that give you insights into your application performance and usage patterns.`,
    },
  ],
};
export const ourteamData = {
  title: "Unlocking the Potential of Cloud-Native Development with Adhar Platform",
  description: "Empower Your Development Journey with Adhar's Comprehensive Suite of Integrated Tools and Seamless Scalability",
  pretitle: "OUR TEAM",
  button: {
    title: "More Details",
    link: "/",
  },
  image: "/assets/imgs/our-team.png",
};
export const WorkWithUsData = {
  workWithUs: {
    title: "Work With Us",
    description: "Together we build your product",
    imageSrc: "/assets/imgs/work-with-us.svg",
  },
  stats: [
    {
      value: "10K+",
      description: "monthly developers",
    },
    {
      value: "1K+",
      description: "applications",
    },
  ],
  button: {
    link: "/",
    title: "Contact Us",
  },
};
export const footerData = {
  email: "contact@adhar.io",
  sections: {
    product: [
      "Features",
      "Security",
      "Team",
      "Enterprise",
      "Customer stories",
      "Pricing",
      "Resources",
    ],
    platform: [
      "Developer API",
      "Partners",
      "Atom",
      "Electron",
      "AstroWind Desktop",
    ],
    support: [
      "Docs",
      "Community Forum",
      "Professional Services",
      "Skills",
      "Status",
    ],
    company: [
      "About",
      "Blog",
      "Careers",
      "Press",
      "Inclusion",
      "Social Impact",
      "Shop",
    ],
  },
  socialLinks: [
    {
      icon: "/assets/icons/linkedin.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/twitter.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/pinterest.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/telegram.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/youtube.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/instagram.svg",
      link: "#",
    },
    {
      icon: "/assets/icons/facebook.svg",
      link: "#",
    },
  ],
  companyInfo: "Super powered by Anitech Consulting Services Pvt Ltd. © 2025 All rights reserved.",
};

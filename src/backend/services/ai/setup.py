import os
from setuptools import setup, find_packages

def read_requirements():
    """Read package requirements from requirements.txt file."""
    requirements = []
    try:
        with open('requirements.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    requirements.append(line)
    except FileNotFoundError:
        # If requirements.txt doesn't exist, use the hardcoded requirements
        pass
    return requirements

setup(
    name="ai-service",
    version="1.0.0",
    description="AI-powered Excel formula generation and optimization service using GPT-4",
    author="Excel AI Team",
    author_email="team@excelai.com",
    license="Proprietary",
    
    # Package configuration
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    include_package_data=True,
    zip_safe=False,
    
    # Python version requirement
    python_requires=">=3.11,<4.0",
    
    # Core dependencies
    install_requires=[
        "fastapi>=0.95.0,<1.0.0",
        "openai>=1.0.0,<2.0.0",
        "pydantic>=2.0.0,<3.0.0",
        "python-dotenv>=1.0.0,<2.0.0",
        "redis>=4.0.0,<5.0.0",
        "uvicorn>=0.21.0,<0.22.0",
        "aiohttp>=3.8.0,<4.0.0",
        "tenacity>=8.0.0,<9.0.0",
        "numpy>=1.24.0,<2.0.0",
        "pandas>=2.0.0,<3.0.0",
        "torch>=2.0.0,<3.0.0",
        "transformers>=4.30.0,<5.0.0",
        "azure-storage-blob>=12.0.0,<13.0.0",
        "azure-keyvault-secrets>=4.0.0,<5.0.0",
        "prometheus-client>=0.16.0,<0.17.0",
    ],
    
    # Optional dependencies
    extras_require={
        "dev": [
            "pytest>=7.3.0,<8.0.0",
            "pytest-asyncio>=0.21.0,<0.22.0",
            "pytest-cov>=4.0.0,<5.0.0",
            "black>=23.3.0,<24.0.0",
            "isort>=5.12.0,<6.0.0",
            "mypy>=1.3.0,<2.0.0",
            "flake8>=6.0.0,<7.0.0",
            "bandit>=1.7.0,<2.0.0",
            "safety>=2.3.0,<3.0.0",
            "locust>=2.15.0,<3.0.0",
            "docker>=6.1.0,<7.0.0",
        ],
        "gpu": [
            "torch-cuda>=2.0.0,<3.0.0",
            "nvidia-ml-py>=11.525.0,<12.0.0",
        ],
    },
    
    # Entry points for CLI commands
    entry_points={
        "console_scripts": [
            "ai-service=src.app:main",
            "ai-service-worker=src.worker:main",
        ],
    },
    
    # Package metadata
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
        "Topic :: Office/Business :: Office Suites",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Framework :: FastAPI",
        "Environment :: GPU :: NVIDIA CUDA",
        "Intended Audience :: Financial and Insurance Industry",
    ],
    platforms=["any"],
    keywords=[
        "excel",
        "ai",
        "formula-generation",
        "gpt-4",
        "machine-learning",
        "office-365",
    ],
)
pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'your-dockerhub-username'
        PROJECT_NAME = 'ai-resume-analyzer'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube analysis for Java services...'
                // With actual SonarQube setup, uncomment below:
                // dir('auth-service') {
                //     sh 'mvn sonar:sonar -Dsonar.projectKey=auth-service'
                // }
                // dir('resume-service') {
                //     sh 'mvn sonar:sonar -Dsonar.projectKey=resume-service'
                // }
            }
        }

        stage('Build Java Services') {
            steps {
                echo 'Building Auth Service'
                dir('auth-service') {
                    sh 'mvn clean package -DskipTests'
                }
                echo 'Building Resume Service'
                dir('resume-service') {
                    sh 'mvn clean package -DskipTests'
                }
                echo 'Building API Gateway'
                dir('api-gateway') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo 'Building React Frontend'
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    def services = ['frontend', 'api-gateway', 'auth-service', 'resume-service', 'ai-service']
                    for (int i = 0; i < services.size(); ++i) {
                        def service = services[i]
                        echo "Building Docker image for ${service}"
                        dir(service) {
                            def image = docker.build("${env.DOCKER_REGISTRY}/${env.PROJECT_NAME}-${service}:latest")
                            // image.push() // Uncomment to push to registry (requires credentials setup in Jenkins)
                        }
                    }
                }
            }
        }

        stage('Deploy via Docker Compose') {
            steps {
                echo 'Deploying application using Docker Compose...'
                sh 'docker-compose down'
                sh 'docker-compose up -d --build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            // Add notification logic (Slack, Email) here
        }
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}

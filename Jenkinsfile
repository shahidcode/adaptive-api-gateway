pipeline {
    agent any

    environment {
        NAMESPACE = "adaptive-gateway"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                dir('gateway') {
                    sh 'npm ci --only=production'
                }
                dir('dashboard') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker build -t adaptive-gateway:latest ./gateway'
                sh 'docker build -t steady-service:latest ./mock-services/steady'
                sh 'docker build -t slow-service:latest ./mock-services/slow'
                sh 'docker build -t burst-target-service:latest ./mock-services/burst-target'
                sh 'docker build -t adaptive-dashboard:latest ./dashboard'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl apply -f k8s/namespace.yaml'
                sh 'kubectl apply -f k8s/configmap.yaml'
                sh 'kubectl apply -f k8s/mock-services/'
                sh 'kubectl apply -f k8s/gateway/'
                sh 'kubectl apply -f k8s/dashboard/'
                sh 'kubectl apply -f k8s/hpa.yaml'
                sh "kubectl rollout status deployment/api-gateway -n ${NAMESPACE} --timeout=120s"
            }
        }
    }

        post {
        success {
            echo "Deployment successful. Dashboard: minikube service dashboard-svc -n ${NAMESPACE}"
            githubNotify context: 'jenkins/pipeline',
                         status: 'SUCCESS',
                         description: 'Build and deploy passed',
                         credentialsId: 'github-token',
                         account: 'shahidcode',
                         repo: 'adaptive-api-gateway',
                         sha: env.GIT_COMMIT
        }
        failure {
            echo "Pipeline failed. Check the logs above."
            githubNotify context: 'jenkins/pipeline',
                         status: 'FAILURE',
                         description: 'Build or deploy failed',
                         credentialsId: 'github-token',
                         account: 'shahidcode',
                         repo: 'adaptive-api-gateway',
                         sha: env.GIT_COMMIT
        }
    }
}

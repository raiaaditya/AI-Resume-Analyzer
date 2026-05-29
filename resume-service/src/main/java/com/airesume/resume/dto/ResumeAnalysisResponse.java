package com.airesume.resume.dto;

import com.airesume.resume.model.ResumeAnalysis;
import java.util.List;

public class ResumeAnalysisResponse {
    private Long id;
    private String filename;
    private String date;
    private int atsScore;
    private int matchPercentage;
    private int experienceYears;
    private String industryCategory;
    private String seniority;
    private List<String> skills;
    private List<String> missingSkills;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> recommendations;
    private List<String> careerSuggestions;

    public ResumeAnalysisResponse() {}

    public ResumeAnalysisResponse(ResumeAnalysis analysis) {
        this.id = analysis.getId();
        this.filename = analysis.getFilename();
        this.date = analysis.getDate();
        this.atsScore = analysis.getAtsScore();
        this.matchPercentage = analysis.getMatchPercentage();
        this.experienceYears = analysis.getExperienceYears();
        this.industryCategory = analysis.getIndustryCategory();
        this.seniority = analysis.getSeniority();
        this.skills = analysis.getSkillsList();
        this.missingSkills = analysis.getMissingSkillsList();
        this.strengths = analysis.getStrengthsList();
        this.weaknesses = analysis.getWeaknessesList();
        this.recommendations = analysis.getRecommendationsList();
        this.careerSuggestions = analysis.getCareerSuggestionsList();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public int getAtsScore() {
        return atsScore;
    }

    public void setAtsScore(int atsScore) {
        this.atsScore = atsScore;
    }

    public int getMatchPercentage() {
        return matchPercentage;
    }

    public void setMatchPercentage(int matchPercentage) {
        this.matchPercentage = matchPercentage;
    }

    public int getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(int experienceYears) {
        this.experienceYears = experienceYears;
    }

    public String getIndustryCategory() {
        return industryCategory;
    }

    public void setIndustryCategory(String industryCategory) {
        this.industryCategory = industryCategory;
    }

    public String getSeniority() {
        return seniority;
    }

    public void setSeniority(String seniority) {
        this.seniority = seniority;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(List<String> missingSkills) {
        this.missingSkills = missingSkills;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(List<String> weaknesses) {
        this.weaknesses = weaknesses;
    }

    public List<String> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<String> recommendations) {
        this.recommendations = recommendations;
    }

    public List<String> getCareerSuggestions() {
        return careerSuggestions;
    }

    public void setCareerSuggestions(List<String> careerSuggestions) {
        this.careerSuggestions = careerSuggestions;
    }
}

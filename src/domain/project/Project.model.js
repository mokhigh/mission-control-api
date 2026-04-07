import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    branch: { type: String, default: 'main' },
  },
  { _id: false }
);

const environmentSchema = new mongoose.Schema(
  {
    name: { type: String, enum: ['dev', 'staging', 'prod'], required: true },
    url: String,
    variables: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['monorepo', 'multirepo'], required: true },
    repositories: { type: [repositorySchema], default: [] },
    environments: { type: [environmentSchema], default: [] },
    config: {
      agentRules: { type: [String], default: [] },
      branchRules: {
        featurePrefix: { type: String, default: 'feat/' },
        requirePR: { type: Boolean, default: true },
      },
      autoApproveEnvs: { type: [String], default: ['dev'] },
    },
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', projectSchema);

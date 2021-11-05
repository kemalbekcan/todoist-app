const { tag } = require("../../model/index");
const { status } = require("../../helpers/constants");
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

module.exports = {
  Subscription: {
    tags: {
      subscribe: () => {
        return pubsub.asyncIterator("tags");
      },
    },
  },
  Query: {
    tags: () => tag.all(),
  },
  Tag: {
    id: (tag) => tag.id,
    user_id: (parent) => parent.user_id,
    name: (tag) => tag.name,
    color: (tag) => tag.color,
    status: (parent) => "active",
  },
  Mutation: {
    addTag: async (_, { input }) => {
      const tagsId = await tag
        .insert({
          user_id: input.user_id,
          name: input.name,
          color: input.color,
          status: status[input.status].id,
        })
        .then((res) => {
          const lastInsertId = res[0];
          return lastInsertId;
        });
      return await tag
        .all(null, [
          "tags.id",
          "tags.user_id",
          "tags.name",
          "tags.color",
          "tags.status",
          "tags.created_at",
        ])
        .where("tags.id", tagsId)
        .then((response) => {
          const item = {
            mutation: "ADD_TAG",
            data: response[0],
          };
          pubsub.publish("tags", { tags: item });
          return {
            id: item.data.id,
            user_id: item.data.user_id,
            name: item.data.name,
            color: item.data.color,
            status: "active",
            created_at: item.data.created_at,
          };
        });
    },
    deleteTag: async (_, { id }) => {
      console.log(id);
      await tag.delete(id).then(async (res) => {
        console.log(res);
        if (res == 1) {
          await pubsub.publish("tags", {
            tags: {
              mutation: "DELETE_TAG",
              data: { id },
            },
          });
          return id;
        }
      });
    },
  },
};

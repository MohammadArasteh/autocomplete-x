import { autocompleteX } from "../src";
import { TAutoCompleteItem } from "../src";
import "./styles.css";
import { faker } from "@faker-js/faker";

type Entity = {
  name: string;
  lastName: string;
  age: number;
};

async function DOMContentLoadedHandler() {
  const items = new Array<TAutoCompleteItem<Entity>>(10000)
    .fill({ label: "", value: {} })
    .map((i) => ({
      label: faker.person.firstName(),
      value: {
        name: faker.person.firstName(),
      },
    }));

  items.unshift({ label: "Amin", value: { name: "Amin" } });

  const { element: autocompleteInput } = autocompleteX<Entity>({
    placeholder: "my auto-complete",
    showOnFocus: true,
    datasource: async (query, page) => {
      const result = items
        .filter((i) => i.label.startsWith(query))
        .slice(page * 10, (page + 1) * 10);
      return result;
    },
    classRules: [
      {
        rule: "data.name === `Amin`",
        classNames: ["golden-item"],
      },
    ],
    className: "custom-class-name",
    onSelect(item) {
      console.log({ item });
    },
    lazyFetch: true,
    nullable: true,
    currentValue: {
      label: "HELLO",
      value: {},
    },
  });
  const body = document.getElementById("app");
  body?.append(autocompleteInput);
}
document.addEventListener("DOMContentLoaded", DOMContentLoadedHandler);

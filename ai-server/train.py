import argparse
from pathlib import Path

import torch
from torch import nn, optim
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import datasets, models, transforms
from torchvision.models import MobileNet_V2_Weights


def build_loaders(dataset_dir: Path, batch_size: int):
    train_dir = dataset_dir / "train"
    val_dir = dataset_dir / "val"
    use_split_dirs = train_dir.exists() and val_dir.exists()

    train_transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(8),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    eval_transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    if use_split_dirs:
        train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
        val_dataset = datasets.ImageFolder(val_dir, transform=eval_transform)
    else:
        train_base = datasets.ImageFolder(dataset_dir, transform=train_transform)
        val_base = datasets.ImageFolder(dataset_dir, transform=eval_transform)
        generator = torch.Generator().manual_seed(42)
        train_indices = []
        val_indices = []

        for class_index in range(len(train_base.classes)):
            indices = [idx for idx, target in enumerate(train_base.targets) if target == class_index]
            permutation = torch.randperm(len(indices), generator=generator).tolist()
            shuffled = [indices[i] for i in permutation]
            val_count = max(1, int(len(shuffled) * 0.2)) if len(shuffled) >= 5 else 0
            val_indices.extend(shuffled[:val_count])
            train_indices.extend(shuffled[val_count:])

        if not val_indices:
            val_indices = train_indices.copy()

        train_dataset = Subset(train_base, train_indices)
        val_dataset = Subset(val_base, val_indices)

    train_targets = [
        train_dataset.dataset.targets[index] if isinstance(train_dataset, Subset) else target
        for index, target in (
            [(idx, None) for idx in train_dataset.indices]
            if isinstance(train_dataset, Subset)
            else list(enumerate(train_dataset.targets))
        )
    ]
    class_counts = torch.bincount(torch.tensor(train_targets), minlength=len(class_names := (train_dataset.dataset.classes if hasattr(train_dataset, "dataset") else train_dataset.classes))).float()
    sample_weights = [1.0 / max(class_counts[target].item(), 1.0) for target in train_targets]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2)
    return train_loader, val_loader, class_names


def build_model(num_classes: int):
    weights = MobileNet_V2_Weights.DEFAULT
    model = models.mobilenet_v2(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    seen = 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item() * images.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            seen += labels.size(0)
    return total_loss / max(seen, 1), correct / max(seen, 1)


def train(args):
    dataset_dir = Path(args.dataset)
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset folder not found: {dataset_dir}")

    train_loader, val_loader, class_names = build_loaders(dataset_dir, args.batch_size)
    if len(class_names) < 2:
        raise ValueError("dataset/ must contain at least two location folders.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model(len(class_names)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)

    best_accuracy = 0.0
    best_state = None
    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        seen = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)
            seen += labels.size(0)

        val_loss, val_accuracy = evaluate(model, val_loader, criterion, device)
        train_loss = running_loss / max(seen, 1)
        print(
            f"Epoch {epoch + 1}/{args.epochs} "
            f"train_loss={train_loss:.4f} val_loss={val_loss:.4f} val_acc={val_accuracy:.3f}"
        )

        if val_accuracy >= best_accuracy:
            best_accuracy = val_accuracy
            best_state = model.state_dict()

    output = Path(args.output)
    torch.save(
        {
            "model_state_dict": best_state or model.state_dict(),
            "class_names": class_names,
            "accuracy": best_accuracy,
            "image_size": 224,
            "architecture": "mobilenet_v2",
        },
        output,
    )
    print(f"Saved {output} with classes: {', '.join(class_names)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune MobileNetV2 for AlzCare location recognition.")
    parser.add_argument("--dataset", default="dataset", help="ImageFolder dataset path.")
    parser.add_argument("--output", default="model.pth", help="Model checkpoint output path.")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    train(parser.parse_args())
